"""Google Sign-In — ID token tekshiruv va mijoz akkaunti."""

from __future__ import annotations

import os
from dataclasses import dataclass

from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.utils import timezone

from accounts.email_utils import is_internal_email, normalize_customer_email
from accounts.models import User


class GoogleAuthError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


@dataclass(frozen=True)
class GoogleProfile:
    sub: str
    email: str
    email_verified: bool
    full_name: str
    first_name: str
    last_name: str


def google_client_ids() -> list[str]:
    raw = os.environ.get("GOOGLE_OAUTH_CLIENT_ID", "").strip()
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def is_google_auth_configured() -> bool:
    return bool(google_client_ids())


def verify_google_id_token(id_token: str) -> GoogleProfile:
    client_ids = google_client_ids()
    if not client_ids:
        raise GoogleAuthError("Google kirish sozlanmagan.", 503)

    token = (id_token or "").strip()
    if not token:
        raise GoogleAuthError("Google token kerak.", 400)

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        last_error: Exception | None = None
        payload = None
        for client_id in client_ids:
            try:
                payload = google_id_token.verify_oauth2_token(
                    token,
                    google_requests.Request(),
                    client_id,
                )
                break
            except ValueError as exc:
                last_error = exc
                payload = None
        if payload is None:
            raise GoogleAuthError("Google token noto'g'ri yoki muddati tugagan.", 401) from last_error
    except GoogleAuthError:
        raise
    except Exception as exc:
        raise GoogleAuthError("Google token tekshirilmadi.", 502) from exc

    sub = str(payload.get("sub") or "").strip()
    email = normalize_customer_email(payload.get("email"))
    email_verified = bool(payload.get("email_verified"))
    if not sub:
        raise GoogleAuthError("Google akkaunt ma'lumoti to'liq emas.", 400)
    if not email:
        raise GoogleAuthError("Google email topilmadi.", 400)
    if not email_verified:
        raise GoogleAuthError("Google emailingiz tasdiqlanmagan.", 400)

    full_name = str(payload.get("name") or "").strip()
    first_name = str(payload.get("given_name") or "").strip()
    last_name = str(payload.get("family_name") or "").strip()
    if not first_name and full_name:
        parts = full_name.split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

    return GoogleProfile(
        sub=sub,
        email=email,
        email_verified=email_verified,
        full_name=full_name,
        first_name=first_name,
        last_name=last_name,
    )


def _apply_google_profile(user: User, profile: GoogleProfile) -> None:
    updates: list[str] = []
    if not user.google_sub:
        user.google_sub = profile.sub
        updates.append("google_sub")
    if is_internal_email(user.email):
        user.email = profile.email
        user.username = profile.email
        updates.extend(["email", "username"])
    if profile.email_verified and user.email_verified_at is None:
        user.email_verified_at = timezone.now()
        updates.append("email_verified_at")
    if profile.full_name and not (user.full_name or "").strip():
        user.full_name = profile.full_name
        updates.append("full_name")
    if profile.first_name and not (user.first_name or "").strip():
        user.first_name = profile.first_name
        updates.append("first_name")
    if profile.last_name and not (user.last_name or "").strip():
        user.last_name = profile.last_name
        updates.append("last_name")
    if updates:
        user.save(update_fields=updates)


def get_or_create_user_from_google(profile: GoogleProfile) -> tuple[User, bool]:
    user = User.objects.filter(google_sub=profile.sub, role=User.Role.USER).first()
    if user:
        _apply_google_profile(user, profile)
        return user, False

    user = User.objects.filter(email__iexact=profile.email, role=User.Role.USER).first()
    if user:
        _apply_google_profile(user, profile)
        return user, False

    try:
        with transaction.atomic():
            user = User.objects.create(
                email=profile.email,
                username=profile.email,
                google_sub=profile.sub,
                full_name=profile.full_name,
                first_name=profile.first_name,
                last_name=profile.last_name,
                role=User.Role.USER,
                password=make_password(None),
                email_verified_at=timezone.now() if profile.email_verified else None,
            )
            return user, True
    except IntegrityError:
        user = User.objects.filter(google_sub=profile.sub, role=User.Role.USER).first()
        if user:
            _apply_google_profile(user, profile)
            return user, False
        user = User.objects.filter(email__iexact=profile.email, role=User.Role.USER).first()
        if user:
            _apply_google_profile(user, profile)
            return user, False
        raise
