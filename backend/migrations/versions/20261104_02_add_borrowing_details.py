"""add borrowing contact, return date, and status

Revision ID: 20261104_02
Revises: 20261104_01
"""

from alembic import op
import sqlalchemy as sa


revision = "20261104_02"
down_revision = "20261104_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "borrowings",
        sa.Column("borrower_contact", sa.String(length=255), nullable=False, server_default="Not provided"),
    )
    op.alter_column("borrowings", "borrower_contact", server_default=None)
    op.alter_column("borrowings", "returned_at", new_column_name="return_date")
    op.add_column(
        "borrowings",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
    )
    op.alter_column("borrowings", "status", server_default=None)
    op.drop_constraint(
        "ck_borrowings_returned_after_borrowed",
        "borrowings",
        type_="check",
    )
    op.create_check_constraint(
        "ck_borrowings_return_date_after_borrowed",
        "borrowings",
        "return_date IS NULL OR return_date >= borrowed_at",
    )
    op.create_check_constraint(
        "ck_borrowings_status_valid",
        "borrowings",
        "status IN ('active', 'returned')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_borrowings_status_valid", "borrowings", type_="check")
    op.drop_constraint(
        "ck_borrowings_return_date_after_borrowed",
        "borrowings",
        type_="check",
    )
    op.alter_column("borrowings", "return_date", new_column_name="returned_at")
    op.create_check_constraint(
        "ck_borrowings_returned_after_borrowed",
        "borrowings",
        "returned_at IS NULL OR returned_at >= borrowed_at",
    )
    op.drop_column("borrowings", "status")
    op.drop_column("borrowings", "borrower_contact")
