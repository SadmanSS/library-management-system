"""add phone to profiles

Revision ID: 20261107_02
Revises: 20261107_01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20261107_02"
down_revision = "20261107_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    columns = {column["name"] for column in inspect(connection).get_columns("profiles")}
    if "phone" not in columns:
        op.add_column("profiles", sa.Column("phone", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "phone")
