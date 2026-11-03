"""add cover image URL to books

Revision ID: 20261104_03
Revises: 20261104_02
"""

from alembic import op
import sqlalchemy as sa


revision = "20261104_03"
down_revision = "20261104_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("books", sa.Column("cover_image_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("books", "cover_image_url")
