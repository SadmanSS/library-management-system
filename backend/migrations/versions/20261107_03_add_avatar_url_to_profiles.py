"""add avatar_url to profiles

Revision ID: 20261107_03
Revises: 20261107_02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20261107_03"
down_revision = "20261107_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    columns = {column["name"] for column in inspect(connection).get_columns("profiles")}
    if "avatar_url" not in columns:
        op.add_column("profiles", sa.Column("avatar_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "avatar_url")
