from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Note, Patient


def _at(value: str) -> datetime:
    return datetime.fromisoformat(value).replace(tzinfo=UTC)


def _patient(
    first_name: str,
    last_name: str,
    dob: str,
    email: str,
    phone: str,
    street: str,
    city: str,
    state: str,
    postal_code: str,
    blood_type: str,
    status: str,
    allergies: list[str],
    conditions: list[str],
    last_visit: str | None,
    notes: list[tuple[str, str]],
    line2: str | None = None,
) -> dict:
    return {
        "first_name": first_name,
        "last_name": last_name,
        "date_of_birth": date.fromisoformat(dob),
        "email": email,
        "phone": phone,
        "address_line1": street,
        "address_line2": line2,
        "city": city,
        "state": state,
        "postal_code": postal_code,
        "blood_type": blood_type,
        "status": status,
        "allergies": allergies,
        "conditions": conditions,
        "last_visit": date.fromisoformat(last_visit) if last_visit else None,
        "notes": notes,
    }


SAMPLE_PATIENTS = [
    _patient(
        "Elena", "Voss", "1979-04-12", "elena.voss@example.com", "(555) 010-1001",
        "18 Harbor Street", "Portland", "ME", "04101", "A+", "active",
        ["Penicillin"], ["Hypertension"], "2026-09-02",
        [
            ("2026-03-02T15:00:00", "Blood pressure at the visit was 148/92. We reviewed a lower-sodium eating plan and home monitoring."),
            ("2026-09-02T15:10:00", "Home readings have settled near 132/84 after the dose adjustment in June. Continue the current plan."),
        ],
        line2="Apt 4",
    ),
    _patient(
        "Marcus", "Hale", "1992-11-03", "marcus.hale@example.com", "(555) 010-1002",
        "440 Pine Court", "Boston", "MA", "02114", "O+", "active",
        [], ["Asthma"], "2026-10-01",
        [("2026-10-01T14:00:00", "Seasonal flare with nighttime cough. Inhaler technique was reviewed and a spacer was dispensed.")],
    ),
    _patient(
        "Priya", "Raman", "1985-06-21", "priya.raman@example.com", "(555) 010-1003",
        "90 Lavender Avenue", "Austin", "TX", "78702", "B+", "critical",
        ["Sulfa drugs"], ["Type 2 diabetes"], "2026-10-18",
        [
            ("2026-08-12T16:20:00", "A1C was 8.4. A dietitian referral was placed."),
            ("2026-10-18T13:05:00", "Glucose readings were above 300 with vomiting. Same-day endocrine follow-up was arranged."),
        ],
        line2="Suite 200",
    ),
    _patient(
        "Jonah", "Ellis", "2001-01-30", "jonah.ellis@example.com", "(555) 010-1004",
        "12 Canyon Road", "Denver", "CO", "80205", "O-", "active",
        ["Latex"], [], "2026-08-14",
        [("2026-08-14T18:00:00", "Pre-procedure screen. Latex allergy confirmed and flagged for the procedure team.")],
    ),
    _patient(
        "Helen", "Cho", "1954-09-08", "helen.cho@example.com", "(555) 010-1005",
        "77 Cedar Lane", "Seattle", "WA", "98103", "AB+", "inactive",
        [], ["Osteoarthritis"], "2025-12-02",
        [("2025-12-02T17:30:00", "Knee pain is stable with activity modification. The patient deferred a return visit until spring.")],
    ),
    _patient(
        "Andre", "Brooks", "1972-02-17", "andre.brooks@example.com", "(555) 010-1006",
        "310 Lake Shore Drive", "Chicago", "IL", "60611", "A-", "discharged",
        ["Ibuprofen"], ["Post-operative knee recovery"], "2026-07-22",
        [
            ("2026-06-02T15:40:00", "Surgical follow-up. The incision is clean and range of motion is improving."),
            ("2026-07-22T15:40:00", "Cleared from the surgical episode and discharged from this course of care."),
        ],
    ),
    _patient(
        "Sofia", "Marin", "2016-05-19", "sofia.marin@example.com", "(555) 010-1007",
        "6 Orchard Place", "San Diego", "CA", "92103", "B-", "active",
        ["Peanuts"], ["Seasonal allergic rhinitis"], "2026-09-28",
        [
            ("2026-05-04T19:00:00", "A peanut exposure caused hives. The family keeps an epinephrine plan at school."),
            ("2026-09-28T16:15:00", "Well-child visit. Growth is tracking as expected and immunizations are up to date."),
        ],
    ),
    _patient(
        "Walter", "Greene", "1948-12-01", "walter.greene@example.com", "(555) 010-1008",
        "51 River Street", "Cleveland", "OH", "44113", "O+", "critical",
        ["ACE inhibitors"], ["Heart failure"], "2026-10-20",
        [("2026-10-20T13:30:00", "Weight is up four pounds in a week with increased shortness of breath. The diuretic plan was adjusted today.")],
    ),
    _patient(
        "Amira", "Nasser", "1990-07-14", "amira.nasser@example.com", "(555) 010-1009",
        "220 Packard Street", "Ann Arbor", "MI", "48104", "A+", "active",
        [], ["Migraine"], "2026-06-11",
        [("2026-06-11T14:45:00", "Migraine days have fallen from eight a month to three after the preventive was started.")],
    ),
    _patient(
        "Theo", "Park", "1988-03-25", "theo.park@example.com", "(555) 010-1010",
        "14 Nicollet Avenue", "Minneapolis", "MN", "55401", "AB-", "active",
        ["Shellfish"], ["Hypothyroidism"], "2026-10-05",
        [("2026-10-05T15:00:00", "TSH is back in range. Continue the current levothyroxine dose.")],
    ),
    _patient(
        "Grace", "Whitfield", "1963-08-09", "grace.whitfield@example.com", "(555) 010-1011",
        "808 Monument Avenue", "Richmond", "VA", "23220", "B+", "inactive",
        [], ["Hyperlipidemia"], "2026-01-19",
        [("2026-01-19T16:10:00", "The lipid panel improved. The next lab was planned for summer, and the patient has not yet returned.")],
    ),
    _patient(
        "Luis", "Ortega", "1998-10-27", "luis.ortega@example.com", "(555) 010-1012",
        "19 Copper Avenue", "Albuquerque", "NM", "87102", "O+", "active",
        [], ["Generalized anxiety"], "2026-09-15",
        [("2026-09-15T18:20:00", "Reports better sleep with the current counseling plan. No medication changes today.")],
        line2="Unit B",
    ),
    _patient(
        "Naomi", "Berg", "1976-12-14", "naomi.berg@example.com", "(555) 010-1013",
        "44 Benefit Street", "Providence", "RI", "02903", "A+", "discharged",
        ["Codeine"], ["Resolved pneumonia"], "2026-04-03",
        [
            ("2026-03-20T14:00:00", "Cough and fever reviewed. Chest findings were consistent with community-acquired pneumonia."),
            ("2026-04-03T14:20:00", "Symptoms resolved and breath sounds are clear. The episode was closed."),
        ],
    ),
    _patient(
        "Caleb", "Nguyen", "2012-02-02", "caleb.nguyen@example.com", "(555) 010-1014",
        "300 J Street", "Sacramento", "CA", "95814", "O-", "active",
        ["Eggs"], [], "2026-08-30",
        [("2026-08-30T17:00:00", "Sports physical completed. Cleared for soccer with an egg-free snack plan.")],
    ),
    _patient(
        "Ruth", "Adler", "1941-05-06", "ruth.adler@example.com", "(555) 010-1015",
        "9 Butler Street", "Pittsburgh", "PA", "15201", "AB+", "critical",
        ["Aspirin"], ["COPD"], "2026-10-22",
        [("2026-10-22T13:15:00", "Increased wheeze and a lower oxygen saturation than baseline. A short steroid course was started, with a nurse check in two days.")],
    ),
    _patient(
        "Isaac", "Romero", "1983-09-18", "isaac.romero@example.com", "(555) 010-1016",
        "160 Congress Street", "Tucson", "AZ", "85701", "B+", "active",
        [], ["GERD"], "2026-07-09",
        [("2026-07-09T19:00:00", "Heartburn is controlled when evening meals are earlier. Continue the current acid reducer.")],
    ),
    _patient(
        "Maya", "Chen", "1995-04-28", "maya.chen@example.com", "(555) 010-1017",
        "501 State Street", "Madison", "WI", "53703", "A-", "active",
        [], ["Iron deficiency anemia"], "2026-10-12",
        [("2026-10-12T15:25:00", "Ferritin is improving on oral iron. We reviewed taking it with vitamin C and away from coffee.")],
    ),
    _patient(
        "Patrick", "Doyle", "1969-01-11", "patrick.doyle@example.com", "(555) 010-1018",
        "22 Church Street", "Burlington", "VT", "05401", "O+", "inactive",
        [], ["Gout"], "2025-11-03",
        [("2025-11-03T16:40:00", "The toe flare has settled. The patient will message the clinic if another flare starts.")],
    ),
    _patient(
        "Leila", "Haddad", "2004-07-07", "leila.haddad@example.com", "(555) 010-1019",
        "75 Broad Street", "Newark", "NJ", "07102", "B-", "active",
        ["Dust mites"], ["Eczema"], "2026-09-01",
        [("2026-09-01T14:50:00", "The flexural rash is quieter with the ointment plan. Dust-mite covers were recommended for the bedroom.")],
    ),
    _patient(
        "Samuel", "Ike", "1958-03-03", "samuel.ike@example.com", "(555) 010-1020",
        "400 Peachtree Street", "Atlanta", "GA", "30308", "A+", "discharged",
        [], ["Cataract surgery recovery"], "2026-05-16",
        [("2026-05-16T15:35:00", "Vision is stable after surgery and the drops are finished. Discharged from this post-operative course.")],
    ),
]


def seed_if_empty(db: Session) -> int:
    existing = db.scalar(select(func.count()).select_from(Patient)) or 0
    if existing:
        return 0

    for record in SAMPLE_PATIENTS:
        notes = record["notes"]
        patient = Patient(**{key: value for key, value in record.items() if key != "notes"})
        db.add(patient)
        db.flush()
        for noted_at, content in notes:
            db.add(Note(patient_id=patient.id, content=content, noted_at=_at(noted_at)))

    db.commit()
    return len(SAMPLE_PATIENTS)
