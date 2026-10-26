from datetime import UTC, date, datetime, timedelta

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.seed import seed_if_empty
from app.utils import calculate_age


def payload(**overrides):
    data = {
        "first_name": "Elena",
        "last_name": "Voss",
        "date_of_birth": "1979-04-12",
        "email": "elena.voss@example.com",
        "phone": "(555) 010-1001",
        "address_line1": "18 Harbor Street",
        "address_line2": "Apt 4",
        "city": "Portland",
        "state": "ME",
        "postal_code": "04101",
        "blood_type": "A+",
        "status": "active",
        "allergies": ["Penicillin"],
        "conditions": ["Hypertension"],
        "last_visit": "2026-09-02",
    }
    data.update(overrides)
    return data


def test_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_list_get_update_and_delete(client: TestClient):
    created = client.post("/patients", json=payload())
    assert created.status_code == 201
    body = created.json()
    assert body["full_name"] == "Elena Voss"
    assert body["age"] == calculate_age(date(1979, 4, 12))
    assert body["email"] == "elena.voss@example.com"
    patient_id = body["id"]

    fetched = client.get(f"/patients/{patient_id}")
    assert fetched.status_code == 200
    assert fetched.json()["conditions"] == ["Hypertension"]

    listed = client.get("/patients")
    assert listed.status_code == 200
    page = listed.json()
    assert page["total"] == 1
    assert page["pages"] == 1
    assert page["items"][0]["id"] == patient_id

    updated = client.put(
        f"/patients/{patient_id}",
        json=payload(last_name="Voss-Hale", phone=""),
    )
    assert updated.status_code == 200
    assert updated.json()["last_name"] == "Voss-Hale"
    assert updated.json()["phone"] is None

    deleted = client.delete(f"/patients/{patient_id}")
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert client.get(f"/patients/{patient_id}").status_code == 404


def test_email_is_normalized_and_unique(client: TestClient):
    first = client.post("/patients", json=payload(email="Elena.Voss@Example.com"))
    assert first.status_code == 201
    assert first.json()["email"] == "elena.voss@example.com"

    duplicate = client.post(
        "/patients",
        json=payload(email="elena.voss@example.com", first_name="Other"),
    )
    assert duplicate.status_code == 409

    other = client.post(
        "/patients",
        json=payload(email="other.person@example.com", first_name="Other"),
    )
    assert other.status_code == 201
    conflict = client.put(
        f"/patients/{other.json()['id']}",
        json=payload(email="elena.voss@example.com", first_name="Other"),
    )
    assert conflict.status_code == 409


def test_validation_errors(client: TestClient):
    future_dob = client.post("/patients", json=payload(date_of_birth="2999-01-01"))
    assert future_dob.status_code == 422
    assert any(error["field"] == "date_of_birth" for error in future_dob.json()["errors"])

    visit_before_birth = client.post(
        "/patients",
        json=payload(date_of_birth="2000-01-01", last_visit="1999-01-01"),
    )
    assert visit_before_birth.status_code == 422
    assert any(error["field"] == "last_visit" for error in visit_before_birth.json()["errors"])

    bad_email = client.post("/patients", json=payload(email="not-an-email"))
    assert bad_email.status_code == 422

    blank_name = client.post("/patients", json=payload(first_name="   "))
    assert blank_name.status_code == 422

    long_line2 = client.post("/patients", json=payload(address_line2="x" * 121))
    assert long_line2.status_code == 422
    assert any(error["field"] == "address_line2" for error in long_line2.json()["errors"])

    bad_status = client.get("/patients?status=nope")
    assert bad_status.status_code == 422
    assert client.get("/patients?page=0").status_code == 422
    assert client.get("/patients?page_size=101").status_code == 422


def test_missing_patient(client: TestClient):
    missing = "11111111-1111-1111-1111-111111111111"
    assert client.get(f"/patients/{missing}").status_code == 404
    assert client.delete(f"/patients/{missing}").status_code == 404
    note = client.post(
        f"/patients/{missing}/notes",
        json={"content": "Missing chart", "noted_at": "2026-01-01T12:00:00Z"},
    )
    assert note.status_code == 404


def test_search_filter_sort_and_pagination(client: TestClient):
    client.post(
        "/patients",
        json=payload(
            first_name="Ada",
            last_name="Young",
            email="ada.young@example.com",
            date_of_birth="2010-01-01",
            status="active",
        ),
    )
    client.post(
        "/patients",
        json=payload(
            first_name="Bea",
            last_name="Olden",
            email="bea.olden@example.com",
            date_of_birth="1940-01-01",
            status="critical",
        ),
    )
    client.post(
        "/patients",
        json=payload(
            first_name="Cam",
            last_name="Middle",
            email="cam.middle@example.com",
            date_of_birth="1980-06-01",
            status="active",
            last_visit=None,
        ),
    )

    by_email = client.get("/patients", params={"search": "BEA.OLDEN"})
    assert by_email.status_code == 200
    assert by_email.json()["total"] == 1
    assert by_email.json()["items"][0]["last_name"] == "Olden"

    by_name = client.get("/patients", params={"search": "ada young"})
    assert [item["last_name"] for item in by_name.json()["items"]] == ["Young"]

    wildcard = client.get("/patients", params={"search": "%"})
    assert wildcard.json()["total"] == 0

    critical = client.get("/patients", params={"status": "critical"})
    assert [item["last_name"] for item in critical.json()["items"]] == ["Olden"]

    oldest_first = client.get("/patients", params={"sort": "age", "order": "desc"})
    names = [item["last_name"] for item in oldest_first.json()["items"]]
    assert names == ["Olden", "Middle", "Young"]

    page = client.get(
        "/patients",
        params={"page": 2, "page_size": 2, "sort": "name", "order": "asc"},
    )
    body = page.json()
    assert body["total"] == 3
    assert body["pages"] == 2
    assert [item["last_name"] for item in body["items"]] == ["Young"]

    no_visit = client.get("/patients", params={"sort": "last_visit", "order": "desc"})
    assert no_visit.json()["items"][-1]["last_name"] == "Middle"


def test_tied_names_do_not_repeat_across_pages(client: TestClient):
    client.post(
        "/patients",
        json=payload(email="sam.one@example.com", first_name="Sam", last_name="Lee"),
    )
    client.post(
        "/patients",
        json=payload(email="sam.two@example.com", first_name="Sam", last_name="Lee"),
    )

    params = {"sort": "name", "order": "asc", "page_size": 1}
    first = client.get("/patients", params={**params, "page": 1})
    second = client.get("/patients", params={**params, "page": 2})
    repeated = client.get("/patients", params={**params, "page": 1})

    assert first.status_code == 200
    first_id = first.json()["items"][0]["id"]
    second_id = second.json()["items"][0]["id"]
    assert first_id != second_id
    assert repeated.json()["items"][0]["id"] == first_id


def test_notes_and_summary(client: TestClient):
    patient_id = client.post("/patients", json=payload(allergies=[], conditions=[])).json()["id"]
    empty = client.get(f"/patients/{patient_id}/summary")
    assert empty.status_code == 200
    assert "No known allergies are recorded." in empty.json()["summary"]
    assert "No conditions are recorded." in empty.json()["summary"]
    assert "No clinical notes have been added." in empty.json()["summary"]
    assert empty.json()["highlights"]["note_count"] == 0

    blank = client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "   ", "noted_at": "2026-02-01T12:00:00Z"},
    )
    assert blank.status_code == 422

    future = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    future_note = client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "Too soon", "noted_at": future},
    )
    assert future_note.status_code == 422

    first = client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "Blood pressure was above goal.", "noted_at": "2026-03-02T15:00:00Z"},
    )
    second = client.post(
        f"/patients/{patient_id}/notes",
        json={"content": "Home readings improved.", "noted_at": "2026-09-02T15:00:00Z"},
    )
    assert first.status_code == 201
    assert second.status_code == 201

    notes = client.get(f"/patients/{patient_id}/notes")
    assert notes.status_code == 200
    contents = [item["content"] for item in notes.json()]
    assert contents == ["Home readings improved.", "Blood pressure was above goal."]

    summary = client.get(f"/patients/{patient_id}/summary").json()
    text = summary["summary"]
    assert "Elena Voss" in text
    assert "A+" in text
    assert str(calculate_age(date(1979, 4, 12))) in text
    assert "blood pressure was above goal" in text
    assert "home readings improved" in text
    assert summary["highlights"]["note_count"] == 2

    other_id = client.post(
        "/patients",
        json=payload(email="second.patient@example.com", first_name="Second"),
    ).json()["id"]
    wrong_chart = client.delete(f"/patients/{other_id}/notes/{first.json()['id']}")
    assert wrong_chart.status_code == 404

    removed = client.delete(f"/patients/{patient_id}/notes/{first.json()['id']}")
    assert removed.status_code == 204
    assert len(client.get(f"/patients/{patient_id}/notes").json()) == 1

    client.delete(f"/patients/{patient_id}")
    assert client.get(f"/patients/{patient_id}/notes").status_code == 404


def test_stats_and_seed(client: TestClient):
    assert client.get("/stats").json() == {
        "total_patients": 0,
        "by_status": {"active": 0, "inactive": 0, "critical": 0, "discharged": 0},
        "note_count": 0,
    }

    session = SessionLocal()
    try:
        inserted = seed_if_empty(session)
        assert inserted >= 15
        assert seed_if_empty(session) == 0
    finally:
        session.close()

    stats = client.get("/stats").json()
    assert stats["total_patients"] == inserted
    assert sum(stats["by_status"].values()) == inserted
    assert stats["note_count"] > 0

    elena = client.get("/patients", params={"search": "elena.voss@example.com"}).json()["items"][0]
    summary = client.get(f"/patients/{elena['id']}/summary").json()["summary"]
    assert "Hypertension" in summary
    assert "Penicillin" in summary
    assert "home readings have settled" in summary

    jonah = client.get("/patients", params={"search": "jonah.ellis@example.com"}).json()["items"][0]
    jonah_summary = client.get(f"/patients/{jonah['id']}/summary").json()["summary"]
    assert "No conditions are recorded." in jonah_summary
    assert "Latex" in jonah_summary
