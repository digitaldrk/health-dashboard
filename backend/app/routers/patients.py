from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    NoteCreate,
    NoteRead,
    PatientPage,
    PatientRead,
    PatientSort,
    PatientStatus,
    PatientWrite,
    SortOrder,
    SummaryRead,
)
from app.services.patients import (
    EmailAlreadyExists,
    add_note,
    create_patient,
    delete_note,
    delete_patient,
    get_note,
    get_patient,
    list_notes,
    list_patients,
    serialize_note,
    serialize_patient,
    update_patient,
)
from app.services.summary import build_summary

router = APIRouter(prefix="/patients", tags=["patients"])


def _patient_or_404(db: Session, patient_id: UUID):
    patient = get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


@router.get("", response_model=PatientPage)
def read_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    status_filter: PatientStatus | None = Query(None, alias="status"),
    sort: PatientSort = PatientSort.name,
    order: SortOrder = SortOrder.asc,
    db: Session = Depends(get_db),
) -> PatientPage:
    return list_patients(
        db,
        page=page,
        page_size=page_size,
        search=search,
        status=status_filter,
        sort=sort,
        order=order,
    )


@router.get("/{patient_id}", response_model=PatientRead)
def read_patient(patient_id: UUID, db: Session = Depends(get_db)) -> PatientRead:
    return serialize_patient(_patient_or_404(db, patient_id))


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient_route(payload: PatientWrite, db: Session = Depends(get_db)) -> PatientRead:
    try:
        patient = create_patient(db, payload)
    except EmailAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this email already exists",
        ) from exc
    return serialize_patient(patient)


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient_route(
    patient_id: UUID,
    payload: PatientWrite,
    db: Session = Depends(get_db),
) -> PatientRead:
    patient = _patient_or_404(db, patient_id)
    try:
        updated = update_patient(db, patient, payload)
    except EmailAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this email already exists",
        ) from exc
    return serialize_patient(updated)


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_route(patient_id: UUID, db: Session = Depends(get_db)) -> Response:
    patient = _patient_or_404(db, patient_id)
    delete_patient(db, patient)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{patient_id}/notes", response_model=list[NoteRead])
def read_notes(patient_id: UUID, db: Session = Depends(get_db)) -> list[NoteRead]:
    _patient_or_404(db, patient_id)
    return [serialize_note(note) for note in list_notes(db, patient_id)]


@router.post("/{patient_id}/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note_route(
    patient_id: UUID,
    payload: NoteCreate,
    db: Session = Depends(get_db),
) -> NoteRead:
    _patient_or_404(db, patient_id)
    return serialize_note(add_note(db, patient_id, payload))


@router.delete("/{patient_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note_route(patient_id: UUID, note_id: UUID, db: Session = Depends(get_db)) -> Response:
    _patient_or_404(db, patient_id)
    note = get_note(db, patient_id, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    delete_note(db, note)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{patient_id}/summary", response_model=SummaryRead)
def read_summary(patient_id: UUID, db: Session = Depends(get_db)) -> SummaryRead:
    patient = _patient_or_404(db, patient_id)
    return build_summary(patient, list_notes(db, patient_id))
