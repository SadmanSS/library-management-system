import json
import os
from collections.abc import Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_session
from models import Profile


bearer_scheme = HTTPBearer(auto_error=False)


def _supabase_request(path: str, method: str = "GET", payload: dict | None = None, token: str | None = None) -> dict:
    supabase_url = os.getenv("SUPABASE_URL")
    api_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not api_key:
        raise HTTPException(status_code=503, detail="Authentication service is not configured")

    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"apikey": api_key, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(f"{supabase_url.rstrip('/')}/auth/v1/{path.lstrip('/')}", data=data, method=method, headers=headers)
    try:
        with urlopen(request, timeout=15) as response:
            response_body = response.read()
            return json.loads(response_body) if response_body else {}
    except HTTPError as error:
        try:
            error_body = json.loads(error.read())
            detail = error_body.get("msg") or error_body.get("message") or error_body.get("error_description")
        except (ValueError, KeyError):
            detail = None
        raise HTTPException(status_code=error.code, detail=detail or "Authentication request failed") from error
    except URLError as error:
        raise HTTPException(status_code=503, detail="Authentication service is unavailable") from error


def sign_up(email: str, password: str, full_name: str | None, phone: str | None = None) -> dict:
    metadata = {}
    if full_name:
        metadata["full_name"] = full_name
    if phone:
        metadata["phone"] = phone
    return _supabase_request("signup", method="POST", payload={
        "email": email,
        "password": password,
        "data": metadata,
    })


def sign_in(email: str, password: str) -> dict:
    return _supabase_request("token?grant_type=password", method="POST", payload={"email": email, "password": password})


def sign_out(token: str) -> None:
    _supabase_request("logout", method="POST", token=token)


def send_password_reset(email: str) -> None:
    _supabase_request("recover", method="POST", payload={"email": email})


def get_supabase_user(token: str) -> dict:
    return _supabase_request("user", token=token)


def get_current_profile(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    session: Session = Depends(get_session),
) -> Profile:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    user = get_supabase_user(credentials.credentials)
    auth_user_id = user.get("id")
    email = user.get("email")
    if not auth_user_id or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

    profile = session.get(Profile, auth_user_id)
    if profile is None:
        initial_admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip().lower()
        user_metadata = user.get("user_metadata") or {}
        profile = Profile(
            auth_user_id=auth_user_id,
            email=email,
            full_name=user_metadata.get("full_name"),
            phone=user_metadata.get("phone"),
            role="admin" if email.lower() == initial_admin_email and initial_admin_email else "member",
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)
    return profile


def require_roles(*roles: str) -> Callable:
    def dependency(profile: Profile = Depends(get_current_profile)) -> Profile:
        if profile.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to perform this action")
        return profile

    return dependency


def get_owned_profile(
    borrowing_user_id: str,
    profile: Profile,
) -> None:
    if profile.role == "member" and borrowing_user_id != profile.auth_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only access your own borrowing records")
