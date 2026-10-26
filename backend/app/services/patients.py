import math
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Note, Patient, utcnow
from app.schemas import (
    NoteCreate,
    NoteRead,
    PatientPage,
    PatientRead,
    PatientSort,
    PatientStatus,
    PatientWrite,
    SortOrder,
    StatsRead,
)
from app.utils import calculate_age


class EmailAlreadyExists(Exception):
    pass


def serialize_patient(patient: Patient) -> PatientRead:
    return PatientRead(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        full_name=f"{patient.first_name} {patient.last_name}",
        date_of_birth=patient.date_of_birth,
        age=calculate_age(patient.date_of_birth),
        email=patient.email,
        phone=patient.phone,
        address_line1=patient.address_line1,
        address_line2=patient.address_line2,
        city=patient.city,
        state=patient.state,
        postal_code=patient.postal_code,
        blood_type=patient.blood_type,
        status=patient.status,
        allergies=list(patient.allergies or []),
        conditions=list(patient.conditions or []),
        last_visit=patient.last_visit,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


def serialize_note(note: Note) -> NoteRead:
    return NoteRead(
        id=note.id,
        patient_id=note.patient_id,
        content=note.content,
        noted_at=note.noted_at,
        created_at=note.created_at,
    )


def _filters(search: str | None, status: PatientStatus | None) -> list:
    filters = []
    if status is not None:
        filters.append(Patient.status == status.value)
    if search and search.strip():
        escaped = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        term = f"%{escaped}%"
        full_name = Patient.first_name + " " + Patient.last_name
        filters.append(
            or_(
                Patient.first_name.ilike(term, escape="\\"),
                Patient.last_name.ilike(term, escape="\\"),
                full_name.ilike(term, escape="\\"),
                Patient.email.ilike(term, escape="\\"),
            )
        )
    return filters


def _apply_sort(stmt, sort: PatientSort, order: SortOrder):
    if sort is PatientSort.name:
        last_name = Patient.last_name.desc() if order is SortOrder.desc else Patient.last_name.asc()
        first_name = (
            Patient.first_name.desc() if order is SortOrder.desc else Patient.first_name.asc()
        )
        return stmt.order_by(last_name, first_name, Patient.id.asc())

    if sort is PatientSort.age:
        column = (
            Patient.date_of_birth.asc() if order is SortOrder.desc else Patient.date_of_birth.desc()
        )
        return stmt.order_by(column, Patient.last_name.asc(), Patient.id.asc())

    if sort is PatientSort.status:
        column = Patient.status.desc() if order is SortOrder.desc else Patient.status.asc()
        return stmt.order_by(column, Patient.last_name.asc(), Patient.id.asc())

    column = Patient.last_visit.desc() if order is SortOrder.desc else Patient.last_visit.asc()
    return stmt.order_by(
        Patient.last_visit.is_(None),
        column,
        Patient.last_name.asc(),
        Patient.id.asc(),
    )


def list_patients(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: str | None,
    status: PatientStatus | None,
    sort: PatientSort,
    order: SortOrder,
) -> PatientPage:
    filters = _filters(search, status)
    count_stmt = select(func.count()).select_from(Patient)
    stmt = select(Patient)
    if filters:
        count_stmt = count_stmt.where(*filters)
        stmt = stmt.where(*filters)
    total = db.scalar(count_stmt) or 0
    stmt = _apply_sort(stmt, sort, order)
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    items = [serialize_patient(patient) for patient in db.scalars(stmt)]
    pages = math.ceil(total / page_size) if total else 0
    return PatientPage(items=items, total=total, page=page, page_size=page_size, pages=pages)


def get_patient(db: Session, patient_id: UUID) -> Patient | None:
    return db.get(Patient, patient_id)


def _commit_patient(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        message = str(getattr(exc, "orig", exc)).lower()
        if "email" in message or "unique" in message:
            raise EmailAlreadyExists from exc
        raise


def create_patient(db: Session, data: PatientWrite) -> Patient:
    patient = Patient(**data.model_dump())
    db.add(patient)
    _commit_patient(db)
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient: Patient, data: PatientWrite) -> Patient:
    for key, value in data.model_dump().items():
        setattr(patient, key, value)
    patient.updated_at = utcnow()
    _commit_patient(db)
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient: Patient) -> None:
    db.delete(patient)
    db.commit()


def list_notes(db: Session, patient_id: UUID) -> list[Note]:
    stmt = (
        select(Note)
        .where(Note.patient_id == patient_id)
        .order_by(Note.noted_at.desc(), Note.id.desc())
    )
    return list(db.scalars(stmt))


def add_note(db: Session, patient_id: UUID, data: NoteCreate) -> Note:
    note = Note(patient_id=patient_id, content=data.content, noted_at=data.noted_at)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def get_note(db: Session, patient_id: UUID, note_id: UUID) -> Note | None:
    note = db.get(Note, note_id)
    if note is None or note.patient_id != patient_id:
        return None
    return note


def delete_note(db: Session, note: Note) -> None:
    db.delete(note)
    db.commit()


def patient_stats(db: Session) -> StatsRead:
    total = db.scalar(select(func.count()).select_from(Patient)) or 0
    rows = db.execute(select(Patient.status, func.count()).group_by(Patient.status)).all()
    by_status = {status.value: 0 for status in PatientStatus}
    for status, count in rows:
        by_status[status] = count
    note_count = db.scalar(select(func.count()).select_from(Note)) or 0
    return StatsRead(total_patients=total, by_status=by_status, note_count=note_count)
