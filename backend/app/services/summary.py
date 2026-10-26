from app.models import Note, Patient
from app.schemas import SummaryHighlights, SummaryRead
from app.utils import calculate_age, format_long_date

STATUS_PHRASE = {
    "active": "active",
    "inactive": "inactive",
    "critical": "critical, needs attention",
    "discharged": "discharged",
}


def join_phrases(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return ", ".join(items[:-1]) + f", and {items[-1]}"


def _embed_note(text: str) -> str:
    cleaned = " ".join(text.split()).rstrip()
    if cleaned and cleaned[0].isupper() and (len(cleaned) == 1 or not cleaned[1].isupper()):
        cleaned = cleaned[0].lower() + cleaned[1:]
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def build_summary(patient: Patient, notes: list[Note]) -> SummaryRead:
    age = calculate_age(patient.date_of_birth)
    name = f"{patient.first_name} {patient.last_name}"
    conditions = list(patient.conditions or [])
    allergies = list(patient.allergies or [])
    sentences = [
        (
            f"{name} is a {age}-year-old patient with blood type {patient.blood_type}. "
            f"Chart status: {STATUS_PHRASE.get(patient.status, patient.status)}."
        )
    ]
    if patient.last_visit:
        sentences.append(f"The most recent visit was {format_long_date(patient.last_visit)}.")
    else:
        sentences.append("No visit date is recorded.")

    if conditions:
        sentences.append(f"Recorded conditions include {join_phrases(conditions)}.")
    else:
        sentences.append("No conditions are recorded.")

    if allergies:
        sentences.append(f"Allergies on file: {join_phrases(allergies)}.")
    else:
        sentences.append("No known allergies are recorded.")

    if notes:
        ordered = sorted(notes, key=lambda note: (note.noted_at, str(note.id)))
        narrative = " ".join(
            f"On {format_long_date(note.noted_at)}, {_embed_note(note.content)}" for note in ordered
        )
        label = "One clinical note is on file." if len(ordered) == 1 else (
            f"{len(ordered)} clinical notes are on file."
        )
        sentences.append(f"{label} {narrative}")
    else:
        sentences.append("No clinical notes have been added.")

    return SummaryRead(
        patient_id=patient.id,
        summary=" ".join(sentences),
        highlights=SummaryHighlights(
            name=name,
            age=age,
            blood_type=patient.blood_type,
            status=patient.status,
            conditions=conditions,
            allergies=allergies,
            note_count=len(notes),
        ),
    )
