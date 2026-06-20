"""Mijoz kirish sessiyalari — qurilma ro'yxati va bekor qilish."""

from __future__ import annotations

from django.core.cache import cache
from django.utils import timezone
from rest_framework.request import Request
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, UserSession

REVOKED_JTI_PREFIX = "user_revoked_jti:"
REVOKED_JTI_TTL_SECONDS = 7 * 24 * 3600


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _parse_device_name(user_agent: str) -> str:
    ua = user_agent or ""
    if "iPhone" in ua or "iPad" in ua:
        return "iPhone / iPad"
    if "Android" in ua:
        return "Android"
    if "Macintosh" in ua:
        return "Mac"
    if "Windows" in ua:
        return "Windows"
    if "Linux" in ua:
        return "Linux"
    if "Mobile" in ua:
        return "Mobil brauzer"
    if ua:
        return "Brauzer"
    return "Noma'lum qurilma"


def _parse_platform(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "iphone" in ua or "ipad" in ua:
        return "ios"
    if "android" in ua:
        return "android"
    if ua:
        return "web"
    return "unknown"


def is_refresh_jti_revoked(jti: str | None) -> bool:
    if not jti:
        return False
    return cache.get(f"{REVOKED_JTI_PREFIX}{jti}") is not None


def revoke_refresh_jti(jti: str | None) -> None:
    if not jti:
        return
    cache.set(f"{REVOKED_JTI_PREFIX}{jti}", "1", timeout=REVOKED_JTI_TTL_SECONDS)


def record_user_session(
    user: User,
    refresh: RefreshToken,
    request: Request | None = None,
    *,
    device_name: str = "",
    platform: str = "",
) -> UserSession:
    jti = str(refresh.get("jti", "") or "")
    user_agent = ""
    if request is not None:
        user_agent = request.META.get("HTTP_USER_AGENT", "") or ""
    if not device_name:
        device_name = _parse_device_name(user_agent)
    if not platform:
        platform = _parse_platform(user_agent)

    session = UserSession.objects.create(
        user=user,
        refresh_jti=jti,
        device_name=device_name[:128],
        platform=platform[:32],
        user_agent=user_agent[:512],
        ip_address=_client_ip(request),
        last_seen_at=timezone.now(),
    )
    return session


def touch_session_by_jti(jti: str | None) -> None:
    if not jti:
        return
    UserSession.objects.filter(refresh_jti=jti, revoked_at__isnull=True).update(
        last_seen_at=timezone.now()
    )


def rotate_session_jti(old_jti: str | None, new_jti: str | None) -> None:
    if not old_jti or not new_jti:
        return
    UserSession.objects.filter(refresh_jti=old_jti, revoked_at__isnull=True).update(
        refresh_jti=new_jti,
        last_seen_at=timezone.now(),
    )


def revoke_session(user: User, session_id: int, *, except_jti: str | None = None) -> bool:
    try:
        session = UserSession.objects.get(pk=session_id, user=user, revoked_at__isnull=True)
    except UserSession.DoesNotExist:
        return False
    if except_jti and session.refresh_jti == except_jti:
        return False
    session.revoked_at = timezone.now()
    session.save(update_fields=["revoked_at"])
    revoke_refresh_jti(session.refresh_jti)
    return True


def revoke_other_sessions(user: User, current_jti: str | None) -> int:
    qs = UserSession.objects.filter(user=user, revoked_at__isnull=True)
    if current_jti:
        qs = qs.exclude(refresh_jti=current_jti)
    count = 0
    for session in qs:
        session.revoked_at = timezone.now()
        session.save(update_fields=["revoked_at"])
        revoke_refresh_jti(session.refresh_jti)
        count += 1
    return count


def current_session_jti_from_request(request: Request) -> str | None:
    session_id = request.headers.get("X-Session-Id") or request.query_params.get("current_session")
    if session_id and str(session_id).isdigit():
        try:
            session = UserSession.objects.get(
                pk=int(session_id),
                user=request.user,
                revoked_at__isnull=True,
            )
            return session.refresh_jti or None
        except UserSession.DoesNotExist:
            pass
    refresh_raw = request.data.get("current_refresh") if hasattr(request, "data") else None
    if isinstance(refresh_raw, str) and refresh_raw.strip():
        try:
            token = RefreshToken(refresh_raw.strip())
            return str(token.get("jti", "") or "") or None
        except Exception:
            return None
    return None
