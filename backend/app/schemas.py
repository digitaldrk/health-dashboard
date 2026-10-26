import re
from datetime import UTC, date, datetime, timedelta
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PatientStatus(StrEnum):
    active = "active"
    inactive = "inactive"
    critical = "critical"
    discharged = "discharged"


class BloodType(StrEnum):
    a_positive = "A+"
    a_negative = "A-"
    b_positive = "B+"
    b_negative = "B-"
    ab_positive = "AB+"
    ab_negative = "AB-"
    o_positive = "O+"
    o_negative = "O-"
    unknown = "unknown"


class PatientSort(StrEnum):
    name = "name"
    age = "age"
    last_visit = "last_visit"
    status = "status"


class SortOrder(StrEnum):
    asc = "asc"
    desc = "desc"


class PatientWrite(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    date_of_birth: date
    email: EmailStr
    phone: str | None = None
    address_line1: str = Field(min_length=1, max_length=120)
    address_line2: str | None = Field(default=None, max_length=120)
    city: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=1, max_length=50)
    postal_code: str = Field(min_length=1, max_length=12)
    blood_type: BloodType
    status: PatientStatus
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    last_visit: date | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
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
        }
    )

    @field_validator(
        "first_name",
        "last_name",
        "address_line1",
        "city",
        "state",
        "postal_code",
    )
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("phone", "address_line2")
    @classmethod
    def empty_to_none(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not re.fullmatch(r"[0-9+().\-\s]{7,20}", value):
            raise ValueError("Enter a valid phone number")
        return value

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        if value < date(1900, 1, 1):
            raise ValueError("Date of birth must be on or after 1900-01-01")
        return value

    @field_validator("last_visit")
    @classmethod
    def validate_last_visit(cls, value: date | None, info) -> date | None:
        if value is None:
            return None
        if value > date.today():
            raise ValueError("Last visit cannot be in the future")
        dob = info.data.get("date_of_birth")
        if isinstance(dob, date) and value < dob:
            raise ValueError("Last visit cannot be before date of birth")
        return value

    @field_validator("allergies", "conditions")
    @classmethod
    def clean_string_list(cls, values: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for raw in values:
            item = raw.strip()
            if not item:
                raise ValueError("Entries cannot be blank")
            if len(item) > 80:
                raise ValueError("Each entry must be 80 characters or fewer")
            key = item.casefold()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(item)
        if len(cleaned) > 20:
            raise ValueError("No more than 20 entries are allowed")
        return cleaned


class PatientRead(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    full_name: str
    date_of_birth: date
    age: int
    email: str
    phone: str | None
    address_line1: str
    address_line2: str | None
    city: str
    state: str
    postal_code: str
    blood_type: str
    status: str
    allergies: list[str]
    conditions: list[str]
    last_visit: date | None
    created_at: datetime
    updated_at: datetime


class PatientPage(BaseModel):
    items: list[PatientRead]
    total: int
    page: int
    page_size: int
    pages: int


class NoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    noted_at: datetime

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Note content is required")
        return cleaned

    @field_validator("noted_at")
    @classmethod
    def validate_noted_at(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        else:
            value = value.astimezone(UTC)
        now = datetime.now(UTC)
        if value > now + timedelta(minutes=5):
            raise ValueError("Note time cannot be in the future")
        if value < datetime(1990, 1, 1, tzinfo=UTC):
            raise ValueError("Note time is too far in the past")
        return value


class NoteRead(BaseModel):
    id: UUID
    patient_id: UUID
    content: str
    noted_at: datetime
    created_at: datetime


class SummaryHighlights(BaseModel):
    name: str
    age: int
    blood_type: str
    status: str
    conditions: list[str]
    allergies: list[str]
    note_count: int


class SummaryRead(BaseModel):
    patient_id: UUID
    summary: str
    highlights: SummaryHighlights


class StatsRead(BaseModel):
    total_patients: int
    by_status: dict[str, int]
    note_count: int


class ApiErrorItem(BaseModel):
    field: str
    message: str
