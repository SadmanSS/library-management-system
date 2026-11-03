from fastapi import FastAPI
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import check_database_connection, get_session
from models import Book, Borrowing
from schemas import BookCreate, BookRead, BorrowingCreate, BorrowingRead

app = FastAPI(title="Library Management System API")


@app.get("/")
def root():
    return {"message": "Library Management System API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/health/database")
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


@app.get("/api/books", response_model=list[BookRead])
def list_books(session: Session = Depends(get_session)):
    return session.scalars(select(Book).order_by(Book.title)).all()


@app.get("/api/books/{book_id}", response_model=BookRead)
def get_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.post(
    "/api/borrowings",
    response_model=BorrowingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_borrowing(
    borrowing: BorrowingCreate,
    session: Session = Depends(get_session),
):
    book = session.get(Book, borrowing.book_id)
    if book is None:
        raise HTTPException(status_code=404, detail="Book not found")
    if book.available_copies == 0:
        raise HTTPException(status_code=409, detail="Book is not available")

    book.available_copies -= 1
    db_borrowing = Borrowing(**borrowing.model_dump())
    session.add(db_borrowing)
    session.commit()
    session.refresh(db_borrowing)
    return db_borrowing


@app.get("/api/borrowings", response_model=list[BorrowingRead])
def list_borrowings(session: Session = Depends(get_session)):
    return session.scalars(select(Borrowing).order_by(Borrowing.borrowed_at.desc())).all()
