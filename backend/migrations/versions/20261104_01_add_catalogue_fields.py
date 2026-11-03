"""add catalogue fields to books

Revision ID: 20261104_01
Revises: 20261103_01
"""

from alembic import op
import sqlalchemy as sa


revision = "20261104_01"
down_revision = "20261103_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "books",
        sa.Column("category", sa.String(length=100), nullable=False, server_default="Uncategorized"),
    )
    op.add_column(
        "books",
        sa.Column("description", sa.String(length=2000), nullable=True),
    )
    op.alter_column("books", "category", server_default=None)


def downgrade() -> None:
    op.drop_column("books", "description")
    op.drop_column("books", "category")
