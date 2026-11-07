import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from database import Base
from database import get_session
from auth import get_current_profile
from main import app, create_book, get_book, list_books
from models import Profile
from schemas import BookCreate


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

    def override_profile():
        return Profile(auth_user_id="test-librarian", email="librarian@example.com", role="librarian")

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_profile] = override_profile
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def book_payload(**overrides):
    payload = {
        "title": "Dune",
        "author": "Frank Herbert",
        "isbn": "9780441172719",
        "category": "Science Fiction",
        "description": "A novel about a desert planet.",
        "total_copies": 3,
        "available_copies": 2,
    }
    payload.update(overrides)
    return BookCreate(**payload)


def test_create_list_and_get_book(session):
    book = create_book(book_payload(), session)

    assert get_book(book.id, session).isbn == "9780441172719"
    assert list_books(session)[0].available_copies == 2


def test_available_copies_cannot_exceed_total_copies():
    with pytest.raises(ValueError, match="cannot exceed"):
        book_payload(available_copies=4)


def test_get_missing_book_returns_not_found(session):
    with pytest.raises(HTTPException) as error:
        get_book(999, session)

    assert error.value.status_code == 404


def test_duplicate_isbn_returns_conflict(session):
    create_book(book_payload(), session)

    with pytest.raises(HTTPException) as error:
        create_book(book_payload(title="Another book"), session)

    assert error.value.status_code == 409


def test_book_catalogue_http_endpoints(client):
    response = client.post(
        "/api/books",
        json={
            "title": "The Hobbit",
            "author": "J. R. R. Tolkien",
            "isbn": "9780261102217",
            "category": "Fantasy",
            "total_copies": 2,
        },
    )
    assert response.status_code == 201
    book_id = response.json()["id"]

    assert client.get("/api/books").status_code == 200
    assert client.get(f"/api/books/{book_id}").json()["title"] == "The Hobbit"
    assert client.get("/api/books/999").status_code == 404
    assert (
        client.post(
            "/api/books",
            json={
                "title": "Duplicate",
                "author": "Author",
                "isbn": "9780261102217",
                "category": "Fantasy",
                "total_copies": 1,
            },
        ).status_code
        == 409
    )
