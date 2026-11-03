from datetime import date

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from database import Base
from database import get_session
from main import app, create_book, create_borrowing, get_borrowing, return_borrowing
from schemas import BookCreate, BorrowingCreate


@pytest.fixture
def session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    with Session(engine) as database_session:
        yield database_session


@pytest.fixture
def client(session):
    def override_session():
        yield session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def create_test_book(session, copies=1):
    return create_book(
        BookCreate(
            title="Dune",
            author="Frank Herbert",
            isbn="9780441172719",
            category="Science Fiction",
            total_copies=copies,
        ),
        session,
    )


def borrowing_payload(book_id):
    return BorrowingCreate(
        book_id=book_id,
        borrower_name="Reader",
        borrower_contact="reader@example.com",
        due_date=date(2026, 12, 1),
    )


def test_borrowing_decreases_availability_and_can_be_retrieved(session):
    book = create_test_book(session, copies=2)
    borrowing = create_borrowing(borrowing_payload(book.id), session)

    assert borrowing.status == "active"
    assert borrowing.return_date is None
    assert get_borrowing(borrowing.id, session).borrower_contact == "reader@example.com"
    session.refresh(book)
    assert book.available_copies == 1


def test_borrowing_is_rejected_when_no_copies_are_available(session):
    book = create_test_book(session)
    create_borrowing(borrowing_payload(book.id), session)

    with pytest.raises(HTTPException) as error:
        create_borrowing(borrowing_payload(book.id), session)

    assert error.value.status_code == 409


def test_missing_borrowing_returns_not_found(session):
    with pytest.raises(HTTPException) as error:
        get_borrowing(999, session)

    assert error.value.status_code == 404


def test_return_updates_borrowing_and_availability(session):
    book = create_test_book(session)
    borrowing = create_borrowing(borrowing_payload(book.id), session)

    returned = return_borrowing(borrowing.id, session)

    assert returned.status == "returned"
    assert returned.return_date is not None
    session.refresh(book)
    assert book.available_copies == book.total_copies


def test_returning_same_borrowing_twice_is_rejected(session):
    book = create_test_book(session)
    borrowing = create_borrowing(borrowing_payload(book.id), session)
    return_borrowing(borrowing.id, session)

    with pytest.raises(HTTPException) as error:
        return_borrowing(borrowing.id, session)

    assert error.value.status_code == 409


def test_missing_return_transaction_returns_not_found(session):
    with pytest.raises(HTTPException) as error:
        return_borrowing(999, session)

    assert error.value.status_code == 404


def test_borrowing_http_endpoints(client):
    book_response = client.post(
        "/api/books",
        json={
            "title": "The Hobbit",
            "author": "J. R. R. Tolkien",
            "isbn": "9780261102217",
            "category": "Fantasy",
            "total_copies": 1,
        },
    )
    book_id = book_response.json()["id"]

    borrowing_response = client.post(
        "/api/borrowings",
        json={
            "book_id": book_id,
            "borrower_name": "Reader",
            "borrower_contact": "reader@example.com",
            "due_date": "2026-12-01",
        },
    )
    assert borrowing_response.status_code == 201
    borrowing_id = borrowing_response.json()["id"]
    assert client.get(f"/api/borrowings/{borrowing_id}").json()["status"] == "active"
    assert client.post(
        "/api/borrowings",
        json={
            "book_id": book_id,
            "borrower_name": "Second reader",
            "borrower_contact": "second@example.com",
            "due_date": "2026-12-02",
        },
    ).status_code == 409


def test_return_http_endpoint(client):
    book_response = client.post(
        "/api/books",
        json={
            "title": "Returned Book",
            "author": "Author",
            "isbn": "9780000000001",
            "category": "Fiction",
            "total_copies": 1,
        },
    )
    borrowing_response = client.post(
        "/api/borrowings",
        json={
            "book_id": book_response.json()["id"],
            "borrower_name": "Reader",
            "borrower_contact": "reader@example.com",
            "due_date": "2026-12-01",
        },
    )
    borrowing_id = borrowing_response.json()["id"]

    returned_response = client.post(f"/api/borrowings/{borrowing_id}/return")
    assert returned_response.status_code == 200
    assert returned_response.json()["status"] == "returned"
    assert client.post(f"/api/borrowings/{borrowing_id}/return").status_code == 409
