from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    isbn: str | None = Field(default=None, max_length=20)
    total_copies: int = Field(default=1, ge=0)


class BookRead(BookCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    available_copies: int
    created_at: datetime
    updated_at: datetime


class BorrowingCreate(BaseModel):
    book_id: int
    borrower_name: str = Field(min_length=1, max_length=255)
    due_date: date


class BorrowingRead(BorrowingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    borrowed_at: datetime
    returned_at: datetime | None
