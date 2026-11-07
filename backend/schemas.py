from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BookCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    author: str = Field(min_length=1, max_length=255)
    isbn: str = Field(min_length=1, max_length=20)
    category: str = Field(min_length=1, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    total_copies: int = Field(ge=0)
    available_copies: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_copy_counts(self):
        if self.available_copies is not None and self.available_copies > self.total_copies:
            raise ValueError("available_copies cannot exceed total_copies")
        return self


class BookRead(BookCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cover_image_url: str | None = None
    available_copies: int
    created_at: datetime
    updated_at: datetime


class BorrowingCreate(BaseModel):
    book_id: int
    borrower_name: str = Field(min_length=1, max_length=255)
    borrower_contact: str = Field(min_length=1, max_length=255)
    due_date: date


class BorrowingRead(BorrowingCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    borrowed_at: datetime
    return_date: datetime | None
    status: str


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=50)


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    auth_user_id: str
    email: str
    full_name: str | None
    phone: str | None = None
    avatar_url: str | None = None
    role: str


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    avatar_url: str | None = Field(default=None, max_length=2048)


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(member|librarian|admin)$")
