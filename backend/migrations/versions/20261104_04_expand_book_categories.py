"""allow multiple book categories

Revision ID: 20261104_04
Revises: 20261104_03
"""

from alembic import op
import sqlalchemy as sa


revision = "20261104_04"
down_revision = "20261104_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("books", "category", existing_type=sa.String(length=100), type_=sa.String(length=500), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("books", "category", existing_type=sa.String(length=500), type_=sa.String(length=100), existing_nullable=False)
