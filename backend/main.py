from datetime import datetime, timezone
import os

from fastapi import FastAPI, File, Form, UploadFile
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import check_database_connection, get_session
from auth import (
    bearer_scheme,
    get_current_profile,
    require_roles,
    send_password_reset,
    sign_in,
    sign_out,
    sign_up,
)
from models import Book, Borrowing, Profile
from schemas import (
    BookCreate,
    BookRead,
    BorrowingCreate,
    BorrowingRead,
    LoginRequest,
    PasswordResetRequest,
    ProfileRead,
    ProfileUpdate,
    RegisterRequest,
    RoleUpdate,
)
from storage import upload_cover_image

app = FastAPI(
    title="Library Management System API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


@app.get("/")
def root():
    return {"message": "Library Management System API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/health/database")
@app.get("/api/database")
def database_health_check():
    check_database_connection()
    return {"status": "ok", "database": "connected"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, session: Session = Depends(get_session)):
    result = sign_up(request.email, request.password, request.full_name, request.phone)
    user = result.get("user") or {}
    if user.get("id"):
        session.add(Profile(
            auth_user_id=user["id"],
            email=user.get("email", request.email),
            full_name=request.full_name,
            phone=request.phone,
            role=(
                "admin"
                if request.email.lower() == os.getenv("INITIAL_ADMIN_EMAIL", "").strip().lower()
                and os.getenv("INITIAL_ADMIN_EMAIL", "").strip()
                else "member"
            ),
        ))
        try:
            session.commit()
        except IntegrityError as error:
            session.rollback()
            raise HTTPException(status_code=409, detail="An account with this email already exists") from error
    return {
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "expires_in": result.get("expires_in"),
        "user": user,
        "message": "Registration successful. Check your email if confirmation is required.",
    }


@app.post("/api/auth/login")
def login(request: LoginRequest):
    result = sign_in(request.email, request.password)
    return {
        "access_token": result.get("access_token"),
        "refresh_token": result.get("refresh_token"),
        "expires_in": result.get("expires_in"),
        "user": result.get("user"),
    }


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)):
    if credentials:
        sign_out(credentials.credentials)


@app.post("/api/auth/password-reset")
def password_reset(request: PasswordResetRequest):
    send_password_reset(request.email)
    return {"message": "If an account exists for that email, password reset instructions have been sent."}


@app.get("/api/auth/me", response_model=ProfileRead)
def current_profile(profile: Profile = Depends(get_current_profile)):
    return profile


@app.put("/api/auth/me", response_model=ProfileRead)
def update_profile(
    update: ProfileUpdate,
    profile: Profile = Depends(get_current_profile),
    session: Session = Depends(get_session),
):
    profile.full_name = update.full_name
    if update.phone is not None:
        profile.phone = update.phone
    session.commit()
    session.refresh(profile)
    return profile


@app.get("/api/admin/users", response_model=list[ProfileRead])
def list_users(
    session: Session = Depends(get_session),
    _: Profile = Depends(require_roles("admin")),
):
    return session.scalars(select(Profile).order_by(Profile.email)).all()


@app.patch("/api/admin/users/{auth_user_id}/role", response_model=ProfileRead)
def update_user_role(
    auth_user_id: str,
    role: RoleUpdate,
    session: Session = Depends(get_session),
    current: Profile = Depends(require_roles("admin")),
):
    if auth_user_id == current.auth_user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    profile = session.get(Profile, auth_user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="User profile not found")
    profile.role = role.role
    session.commit()
    session.refresh(profile)
    return profile


@app.post("/api/books", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(
    book: BookCreate,
    session: Session = Depends(get_session),
    _: Profile = Depends(require_roles("librarian", "admin")),
):
    book_data = book.model_dump(exclude={"available_copies"})
    db_book = Book(
        **book_data,
        available_copies=(
            book.total_copies
            if book.available_copies is None
            else book.available_copies
        ),
    )
    session.add(db_book)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if "isbn" in str(error.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A book with this ISBN already exists",
            ) from error
        raise
    session.refresh(db_book)
    return db_book


@app.post("/api/books/with-cover", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book_with_cover(
    title: str = Form(...),
    author: str = Form(...),
    isbn: str = Form(...),
    category: str = Form(...),
    total_copies: int = Form(...),
    description: str | None = Form(None),
    available_copies: int | None = Form(None),
    cover: UploadFile = File(...),
    session: Session = Depends(get_session),
    _: Profile = Depends(require_roles("librarian", "admin")),
):
    try:
        cover_url = upload_cover_image(cover.file.read(), cover.content_type or "")
        book = BookCreate(
            title=title,
            author=author,
            isbn=isbn,
            category=category,
            description=description,
            total_copies=total_copies,
            available_copies=available_copies,
        )
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    db_book = Book(
        **book.model_dump(exclude={"available_copies"}),
        cover_image_url=cover_url,
        available_copies=book.total_copies if book.available_copies is None else book.available_copies,
    )
    session.add(db_book)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if "isbn" in str(error.orig).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A book with this ISBN already exists") from error
        raise
    session.refresh(db_book)
    return db_book


@app.get("/api/books", response_model=list[BookRead])
def list_books(session: Session = Depends(get_session)):
    return session.scalars(select(Book).order_by(Book.title)).all()


@app.get("/api/books/{book_id}", response_model=BookRead)
def get_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.put("/api/books/{book_id}", response_model=BookRead)
def update_book(
    book_id: int,
    book: BookCreate,
    session: Session = Depends(get_session),
    _: Profile = Depends(require_roles("librarian", "admin")),
):
    db_book = session.get(Book, book_id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    for field, value in book.model_dump(exclude_none=True).items():
        setattr(db_book, field, value)
    if book.available_copies is None:
        db_book.available_copies = min(db_book.available_copies, book.total_copies)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if "isbn" in str(error.orig).lower():
            raise HTTPException(status_code=409, detail="A book with this ISBN already exists") from error
        raise
    session.refresh(db_book)
    return db_book


@app.put("/api/books/{book_id}/with-cover", response_model=BookRead)
def update_book_with_cover(
    book_id: int,
    title: str = Form(...),
    author: str = Form(...),
    isbn: str = Form(...),
    category: str = Form(...),
    total_copies: int = Form(...),
    available_copies: int | None = Form(None),
    description: str | None = Form(None),
    cover: UploadFile = File(...),
    session: Session = Depends(get_session),
    _: Profile = Depends(require_roles("librarian", "admin")),
):
    db_book = session.get(Book, book_id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    try:
        cover_url = upload_cover_image(cover.file.read(), cover.content_type or "")
        book = BookCreate(
            title=title,
            author=author,
            isbn=isbn,
            category=category,
            description=description,
            total_copies=total_copies,
            available_copies=available_copies,
        )
    except (ValueError, RuntimeError) as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    for field, value in book.model_dump(exclude={"available_copies"}).items():
        setattr(db_book, field, value)
    db_book.available_copies = (
        min(db_book.available_copies, book.total_copies)
        if book.available_copies is None
        else book.available_copies
    )
    db_book.cover_image_url = cover_url
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        if "isbn" in str(error.orig).lower():
            raise HTTPException(status_code=409, detail="A book with this ISBN already exists") from error
        raise
    session.refresh(db_book)
    return db_book


@app.delete("/api/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(
    book_id: int,
    session: Session = Depends(get_session),
    _: Profile = Depends(require_roles("librarian", "admin")),
):
    db_book = session.get(Book, book_id)
    if db_book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if session.scalar(select(Borrowing.id).where(Borrowing.book_id == book_id).limit(1)) is not None:
        raise HTTPException(status_code=409, detail="Books with borrowing history cannot be deleted")
    session.delete(db_book)
    session.commit()


@app.post(
    "/api/borrowings",
    response_model=BorrowingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_borrowing(
    borrowing: BorrowingCreate,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_profile),
):
    user_id = profile.auth_user_id if isinstance(profile, Profile) else None
    if session.in_transaction():
        session.rollback()
    with session.begin():
        book = session.scalar(
            select(Book)
            .where(Book.id == borrowing.book_id)
            .with_for_update()
        )
        if book is None:
            raise HTTPException(status_code=404, detail="Book not found")
        if book.available_copies == 0:
            raise HTTPException(status_code=409, detail="Book is not available")

        book.available_copies -= 1
        db_borrowing = Borrowing(**borrowing.model_dump(), user_id=user_id)
        session.add(db_borrowing)
        session.flush()
    session.refresh(db_borrowing)
    return db_borrowing


@app.get("/api/borrowings/{borrowing_id}", response_model=BorrowingRead)
def get_borrowing(
    borrowing_id: int,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_profile),
):
    borrowing = session.get(Borrowing, borrowing_id)
    if borrowing is None:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    if isinstance(profile, Profile) and profile.role == "member" and borrowing.user_id != profile.auth_user_id:
        raise HTTPException(status_code=403, detail="You can only access your own borrowing records")
    return borrowing


@app.post(
    "/api/borrowings/{borrowing_id}/return",
    response_model=BorrowingRead,
)
def return_borrowing(
    borrowing_id: int,
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_profile),
):
    if session.in_transaction():
        session.rollback()
    with session.begin():
        borrowing = session.scalar(
            select(Borrowing)
            .where(Borrowing.id == borrowing_id)
            .with_for_update()
        )
        if borrowing is None:
            raise HTTPException(status_code=404, detail="Borrowing not found")
        if isinstance(profile, Profile) and profile.role == "member" and borrowing.user_id != profile.auth_user_id:
            raise HTTPException(status_code=403, detail="You can only return your own borrowing records")
        if borrowing.status == "returned" or borrowing.return_date is not None:
            raise HTTPException(
                status_code=409,
                detail="This borrowing has already been returned",
            )

        book = session.scalar(
            select(Book)
            .where(Book.id == borrowing.book_id)
            .with_for_update()
        )
        if book is None:
            raise HTTPException(status_code=404, detail="Book not found")
        if book.available_copies >= book.total_copies:
            raise HTTPException(
                status_code=409,
                detail="Book availability cannot exceed total copies",
            )

        book.available_copies += 1
        borrowing.status = "returned"
        borrowing.return_date = datetime.now(timezone.utc)
        session.flush()
    session.refresh(borrowing)
    return borrowing


@app.get("/api/borrowings", response_model=list[BorrowingRead])
def list_borrowings(
    session: Session = Depends(get_session),
    profile: Profile = Depends(get_current_profile),
):
    query = select(Borrowing).order_by(Borrowing.borrowed_at.desc())
    if isinstance(profile, Profile) and profile.role == "member":
        query = query.where(Borrowing.user_id == profile.auth_user_id)
    return session.scalars(query).all()
