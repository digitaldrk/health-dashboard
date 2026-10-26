from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "patients",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("last_name", sa.String(80), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address_line1", sa.String(120), nullable=False),
        sa.Column("address_line2", sa.String(120), nullable=True),
        sa.Column("city", sa.String(80), nullable=False),
        sa.Column("state", sa.String(50), nullable=False),
        sa.Column("postal_code", sa.String(12), nullable=False),
        sa.Column("blood_type", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("allergies", sa.JSON(), nullable=False),
        sa.Column("conditions", sa.JSON(), nullable=False),
        sa.Column("last_visit", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status in ('active', 'inactive', 'critical', 'discharged')",
            name="ck_patients_status",
        ),
        sa.CheckConstraint(
            "blood_type in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')",
            name="ck_patients_blood_type",
        ),
        sa.UniqueConstraint("email", name="uq_patients_email"),
    )
    op.create_index("ix_patients_last_name", "patients", ["last_name"])
    op.create_index("ix_patients_email", "patients", ["email"])
    op.create_index("ix_patients_status", "patients", ["status"])
    op.create_index("ix_patients_last_visit", "patients", ["last_visit"])

    op.create_table(
        "notes",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("patient_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("noted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_notes_patient_id", "notes", ["patient_id"])


def downgrade() -> None:
    op.drop_index("ix_notes_patient_id", table_name="notes")
    op.drop_table("notes")
    op.drop_index("ix_patients_last_visit", table_name="patients")
    op.drop_index("ix_patients_status", table_name="patients")
    op.drop_index("ix_patients_email", table_name="patients")
    op.drop_index("ix_patients_last_name", table_name="patients")
    op.drop_table("patients")
