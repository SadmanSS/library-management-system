import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from main import app, _schedule_file, DEFAULT_SCHEDULE
from auth import get_current_profile
from models import Profile


@pytest.fixture
def clean_schedule():
    original_exists = _schedule_file.exists()
    original_content = None
    if original_exists:
        original_content = _schedule_file.read_text(encoding="utf-8")
        _schedule_file.unlink()
    yield
    if original_exists and original_content is not None:
        _schedule_file.write_text(original_content, encoding="utf-8")
    elif _schedule_file.exists():
        _schedule_file.unlink()


def test_get_schedule_default(clean_schedule):
    client = TestClient(app)
    response = client.get("/api/schedule")
    assert response.status_code == 200
    data = response.json()
    assert data["regular_open"] == DEFAULT_SCHEDULE["regular_open"]
    assert "weekly_off_days" in data


def test_update_schedule_authorized(clean_schedule):
    admin_profile = Profile(
        auth_user_id="admin-1",
        email="admin@library.org",
        full_name="Admin User",
        role="admin",
    )
    app.dependency_overrides[get_current_profile] = lambda: admin_profile
    client = TestClient(app)
    try:
        new_schedule = {
            "regular_open": "09:00 AM",
            "regular_close": "07:00 PM",
            "weekly_off_days": ["Sunday", "Monday"],
            "saturday_hours": "10:00 AM – 04:00 PM",
            "exceptions": [{"date": "2026-12-25", "title": "Christmas", "is_closed": True}],
        }
        put_resp = client.put("/api/schedule", json=new_schedule)
        assert put_resp.status_code == 200
        assert put_resp.json()["regular_open"] == "09:00 AM"

        get_resp = client.get("/api/schedule")
        assert get_resp.status_code == 200
        assert get_resp.json()["regular_close"] == "07:00 PM"
        assert len(get_resp.json()["exceptions"]) == 1
    finally:
        app.dependency_overrides.pop(get_current_profile, None)
