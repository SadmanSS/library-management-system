from datetime import datetime, timezone

from fastapi import FastAPI, File, Form, UploadFile
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import check_database_connection, get_session
from models import Book, Borrowing
from schemas import BookCreate, BookRead, BorrowingCreate, BorrowingRead
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


@app.post("/api/books", response_model=BookRead, status_code=status.HTTP_201_CREATED)
def create_book(book: BookCreate, session: Session = Depends(get_session)):
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
def update_book(book_id: int, book: BookCreate, session: Session = Depends(get_session)):
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


@app.delete("/api/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, session: Session = Depends(get_session)):
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
):
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
        db_borrowing = Borrowing(**borrowing.model_dump())
        session.add(db_borrowing)
        session.flush()
    session.refresh(db_borrowing)
    return db_borrowing


@app.get("/api/borrowings/{borrowing_id}", response_model=BorrowingRead)
def get_borrowing(borrowing_id: int, session: Session = Depends(get_session)):
    borrowing = session.get(Borrowing, borrowing_id)
    if borrowing is None:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    return borrowing


@app.post(
    "/api/borrowings/{borrowing_id}/return",
    response_model=BorrowingRead,
)
def return_borrowing(
    borrowing_id: int,
    session: Session = Depends(get_session),
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
def list_borrowings(session: Session = Depends(get_session)):
    return session.scalars(select(Borrowing).order_by(Borrowing.borrowed_at.desc())).all()
