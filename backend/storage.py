import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4


MAX_COVER_SIZE = 5 * 1024 * 1024
ALLOWED_COVER_TYPES = {"image/jpeg", "image/png", "image/webp"}


def upload_cover_image(content: bytes, content_type: str, folder: str = "covers") -> str:
    if content_type not in ALLOWED_COVER_TYPES:
        raise ValueError("Image must be JPEG, PNG, or WebP")
    if len(content) > MAX_COVER_SIZE:
        raise ValueError("Image must be 5 MB or smaller")

    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "book-covers")
    if not supabase_url or not service_key:
        raise RuntimeError("Supabase Storage is not configured")

    extension = content_type.removeprefix("image/").replace("jpeg", "jpg")
    path = f"{folder}/{uuid4()}.{extension}" if folder else f"{uuid4()}.{extension}"
    upload_url = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{path}"
    request = Request(
        upload_url,
        data=content,
        method="POST",
        headers={
            "Authorization": f"Bearer {service_key}",
            "Content-Type": content_type,
            "x-upsert": "false",
        },
    )
    try:
        with urlopen(request, timeout=30):
            pass
    except (HTTPError, URLError) as error:
        raise RuntimeError("Image could not be uploaded to Supabase Storage") from error

    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{path}"


def upload_avatar_image(content: bytes, content_type: str) -> str:
    return upload_cover_image(content, content_type, folder="avatars")
