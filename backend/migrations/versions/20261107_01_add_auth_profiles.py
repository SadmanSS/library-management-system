"""add authentication profiles and borrowing ownership

Revision ID: 20261107_01
Revises: 20261104_04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20261107_01"
down_revision = "20261104_04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    tables = inspect(connection).get_table_names()
    if "profiles" not in tables:
        op.create_table(
            "profiles",
            sa.Column("auth_user_id", sa.String(length=128), primary_key=True),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=True),
            sa.Column("role", sa.String(length=20), nullable=False, server_default="member"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("email", name="uq_profiles_email"),
            sa.CheckConstraint("role IN ('member', 'librarian', 'admin')", name="ck_profiles_role_valid"),
        )
    columns = {column["name"] for column in inspect(connection).get_columns("borrowings")}
    if "user_id" not in columns:
        op.add_column("borrowings", sa.Column("user_id", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("borrowings", "user_id")
    op.drop_table("profiles")
