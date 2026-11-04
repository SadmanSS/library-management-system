"""create books and borrowings tables

Revision ID: 20261103_01
Revises:
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20261103_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    existing_tables = inspect(connection).get_table_names()

    if "books" not in existing_tables:
        op.create_table(
            "books",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("author", sa.String(length=255), nullable=False),
            sa.Column("isbn", sa.String(length=20), nullable=True),
            sa.Column("total_copies", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("available_copies", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.CheckConstraint("total_copies >= 0", name="ck_books_total_copies_nonnegative"),
            sa.CheckConstraint(
                "available_copies >= 0 AND available_copies <= total_copies",
                name="ck_books_available_copies_valid",
            ),
            sa.UniqueConstraint("isbn", name="uq_books_isbn"),
        )
    else:
        existing_columns = {
            column["name"] for column in inspect(connection).get_columns("books")
        }
        columns = (
            ("title", sa.String(length=255), False, ""),
            ("author", sa.String(length=255), False, ""),
            ("isbn", sa.String(length=20), True, None),
            ("total_copies", sa.Integer(), False, "1"),
            ("available_copies", sa.Integer(), False, "1"),
            ("updated_at", sa.DateTime(timezone=True), False, sa.func.now()),
        )
        for name, column_type, nullable, default in columns:
            if name not in existing_columns:
                op.add_column(
                    "books",
                    sa.Column(
                        name,
                        column_type,
                        nullable=nullable,
                        server_default=default,
                    ),
                )
                if default == "":
                    op.alter_column("books", name, server_default=None)

        constraints = {
            constraint["name"]
            for constraint in inspect(connection).get_check_constraints("books")
        }
        if "ck_books_total_copies_nonnegative" not in constraints:
            op.create_check_constraint(
                "ck_books_total_copies_nonnegative",
                "books",
                "total_copies >= 0",
            )
        if "ck_books_available_copies_valid" not in constraints:
            op.create_check_constraint(
                "ck_books_available_copies_valid",
                "books",
                "available_copies >= 0 AND available_copies <= total_copies",
            )

        unique_constraints = {
            constraint["name"]
            for constraint in inspect(connection).get_unique_constraints("books")
        }
        if "uq_books_isbn" not in unique_constraints:
            op.create_unique_constraint("uq_books_isbn", "books", ["isbn"])

    op.create_table(
        "borrowings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("book_id", sa.Integer(), nullable=False),
        sa.Column("borrower_name", sa.String(length=255), nullable=False),
        sa.Column("borrowed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("returned_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "returned_at IS NULL OR returned_at >= borrowed_at",
            name="ck_borrowings_returned_after_borrowed",
        ),
        sa.ForeignKeyConstraint(["book_id"], ["books.id"]),
    )


def downgrade() -> None:
    op.drop_table("borrowings")
    op.drop_table("books")
