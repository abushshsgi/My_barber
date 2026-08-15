"""Mijoz referal servisi — bonussiz attribution + xavfsiz kod generatsiyasi."""

from __future__ import annotations

import os
import secrets

from django.db import IntegrityError, transaction
from django.db.models import F

from .models import ReferralAttribution, User

# O/0, I/1, L kabi chalkash belgilarsiz alifbo.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_CODE_LENGTH = 8
_MAX_ATTEMPTS = 8


def generate_referral_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


def normalize_referral_code(raw: object) -> str:
    """Kodni tozalash — uppercase, faqat alifbodagi belgilar."""
    if not raw:
        return ""
    text = str(raw).strip().upper()
    return "".join(ch for ch in text if ch in _CODE_ALPHABET)[:_CODE_LENGTH]


def ensure_referral_code(user: User) -> str:
    """Foydalanuvchiga kod biriktirish (lazy). Mavjud bo'lsa qaytaradi."""
    if user.referral_code:
        return user.referral_code

    for _ in range(_MAX_ATTEMPTS):
        code = generate_referral_code()
        try:
            with transaction.atomic():
                updated = User.objects.filter(pk=user.pk, referral_code__isnull=True).update(
                    referral_code=code
                )
            if updated:
                user.referral_code = code
                return code
            # Boshqa jarayon oldin yozgan — qayta o'qib qaytaramiz.
            fresh = User.objects.filter(pk=user.pk).values_list("referral_code", flat=True).first()
            if fresh:
                user.referral_code = fresh
                return fresh
        except IntegrityError:
            # Kod to'qnashuvi — boshqa kod bilan qayta urinamiz.
            continue
    # Deyarli imkonsiz; oxirgi urinishda ham to'qnashsa xato ko'tarilsin.
    raise RuntimeError("Referral kod yaratib bo'lmadi.")


def _is_local_origin(origin: str) -> bool:
    lower = origin.lower()
    return (
        "localhost" in lower
        or "127.0.0.1" in lower
        or "0.0.0.0" in lower
        or "[::1]" in lower
    )


def user_app_public_base() -> str:
    """Ulashish uchun ochiq domen — localhost CORS originlari taklif havolasiga tushmaydi."""
    raw = os.environ.get("FRONTEND_USER_ORIGIN", "").strip()
    candidates: list[str] = []
    if raw:
        for part in raw.split(","):
            cleaned = part.strip().strip('"').strip("'").rstrip("/")
            if cleaned:
                candidates.append(cleaned)
    for origin in candidates:
        if not _is_local_origin(origin):
            return origin
    return "https://mysaloon.uz"


def build_invite_url(code: str) -> str:
    from urllib.parse import quote

    return f"{user_app_public_base()}/auth?ref={quote(code, safe='')}"


def apply_referral(*, new_user: User, code: object) -> ReferralAttribution | None:
    """Yangi user yaratilgandan so'ng referal kodni biriktirish.

    Xavfsizlik: faqat yangi (referred_by bo'sh) userga; self-referral va noto'g'ri
    kod jim e'tiborsiz qoldiriladi (enumeration ochilmasin, signup buzilmasin).
    """
    normalized = normalize_referral_code(code)
    if not normalized:
        return None
    if new_user.referred_by_id:
        return None
    if getattr(new_user, "referral_code", None) == normalized:
        return None

    referrer = User.objects.filter(referral_code=normalized).first()
    if not referrer or referrer.pk == new_user.pk:
        return None

    try:
        with transaction.atomic():
            attribution = ReferralAttribution.objects.create(
                referrer=referrer,
                referee=new_user,
                code_used=normalized,
            )
            User.objects.filter(pk=new_user.pk, referred_by__isnull=True).update(
                referred_by=referrer
            )
            # 1 do'st = 1 Morph AI generatsiya krediti
            User.objects.filter(pk=referrer.pk).update(
                morph_referral_credits=F("morph_referral_credits") + 1
            )
            new_user.referred_by = referrer
            return attribution
    except IntegrityError:
        # Referee allaqachon biriktirilgan — jim o'tkazamiz.
        return None
