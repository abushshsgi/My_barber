"""Sartarosh → mijoz chaqirish (MySaloon'ga) — kod, URL va attribution."""

from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.utils import timezone

from accounts.phone_utils import normalize_phone_field
from accounts.referral import (
    generate_referral_code,
    normalize_referral_code,
    user_app_public_base,
)

from .models import Barber, BarberCustomerInvite, BarberCustomerOutreach

_MAX_ATTEMPTS = 8


def _code_taken(code: str) -> bool:
    if Barber.objects.filter(customer_invite_code=code).exists():
        return True
    from accounts.models import User

    return User.objects.filter(referral_code=code).exists()


def ensure_barber_invite_code(barber: Barber) -> str:
    """Sartaroshga unique mijoz-chaqirish kodi (lazy). User referal kodlari bilan to'qnashmaydi."""
    if barber.customer_invite_code:
        return barber.customer_invite_code

    for _ in range(_MAX_ATTEMPTS):
        code = generate_referral_code()
        if _code_taken(code):
            continue
        try:
            with transaction.atomic():
                updated = Barber.objects.filter(
                    pk=barber.pk, customer_invite_code__isnull=True
                ).update(customer_invite_code=code)
            if updated:
                barber.customer_invite_code = code
                return code
            fresh = (
                Barber.objects.filter(pk=barber.pk)
                .values_list("customer_invite_code", flat=True)
                .first()
            )
            if fresh:
                barber.customer_invite_code = fresh
                return fresh
        except IntegrityError:
            continue
    raise RuntimeError("Barber invite kod yaratib bo'lmadi.")


def build_barber_invite_url(code: str) -> str:
    from urllib.parse import quote

    return f"{user_app_public_base()}/auth?bref={quote(code, safe='')}"


def _phone_lookup_variants(phone: str) -> list[str]:
    """DB da turli formatlarda saqlangan telefonlarni topish."""
    variants = {phone}
    digits = "".join(ch for ch in phone if ch.isdigit())
    if digits:
        variants.add(digits)
        variants.add(f"+{digits}")
        if digits.startswith("998") and len(digits) == 12:
            local = digits[3:]
            variants.add(local)
            variants.add(f"+{digits}")
    return [v for v in variants if v]


def _snapshot_customer(user) -> tuple[str, str]:
    name = (getattr(user, "full_name", None) or "").strip()
    if not name:
        name = (getattr(user, "first_name", None) or "").strip() or "Foydalanuvchi"
    phone = (getattr(user, "phone", None) or "") or ""
    return name, phone


def _match_outreach(*, barber: Barber, customer) -> BarberCustomerOutreach | None:
    phone = (getattr(customer, "phone", None) or "").strip()
    if not phone:
        return None
    variants = _phone_lookup_variants(phone)
    return (
        BarberCustomerOutreach.objects.filter(
            barber=barber,
            status=BarberCustomerOutreach.Status.PENDING,
            phone__in=variants,
        )
        .order_by("-created_at", "-id")
        .first()
    )


def apply_barber_invite(*, new_user, code: object) -> BarberCustomerInvite | None:
    """Yangi mijozni sartarosh taklifiga biriktirish.

    Xavfsizlik: faqat yangi (hali attribution yo'q) userga; noto'g'ri kod jim e'tiborsiz.
    Peer referal (User.referred_by) bilan parallel ishlaydi — boshqa jadval.
    """
    normalized = normalize_referral_code(code)
    if not normalized:
        return None
    if BarberCustomerInvite.objects.filter(customer=new_user).exists():
        return None

    barber = Barber.objects.filter(customer_invite_code=normalized, is_active=True).first()
    if not barber:
        return None

    name, phone = _snapshot_customer(new_user)
    outreach = _match_outreach(barber=barber, customer=new_user)
    source = (
        BarberCustomerInvite.Source.OUTREACH
        if outreach
        else BarberCustomerInvite.Source.LINK
    )

    try:
        with transaction.atomic():
            invite = BarberCustomerInvite.objects.create(
                barber=barber,
                customer=new_user,
                code_used=normalized,
                source=source,
                outreach=outreach,
                customer_full_name=name,
                customer_phone=phone,
            )
            if outreach:
                now = timezone.now()
                BarberCustomerOutreach.objects.filter(pk=outreach.pk).update(
                    status=BarberCustomerOutreach.Status.JOINED,
                    joined_customer=new_user,
                    joined_at=now,
                )
            return invite
    except IntegrityError:
        return None


def apply_signup_invites(*, new_user, referral_code=None, barber_invite_code=None) -> dict:
    """Signupda peer referal + barber invite birga (bir-birini to'smaydi)."""
    from accounts.referral import apply_referral

    peer = None
    barber = None
    if referral_code:
        peer = apply_referral(new_user=new_user, code=referral_code)
    # Agar alohida barber kodi berilmasa, referral_code sartarosh kodi bo'lishi mumkin
    # (faqat peer topilmaganda — chalkashlikni kamaytirish).
    raw_barber = barber_invite_code
    if not raw_barber and referral_code and peer is None:
        raw_barber = referral_code
    if raw_barber:
        barber = apply_barber_invite(new_user=new_user, code=raw_barber)
    return {"peer": peer, "barber": barber}


def create_outreach(
    *,
    barber: Barber,
    full_name: str = "",
    phone: str = "",
    channel: str = BarberCustomerOutreach.Channel.TELEGRAM,
    note: str = "",
) -> BarberCustomerOutreach:
    name = (full_name or "").strip()[:255]
    note_clean = (note or "").strip()[:512]
    phone_norm = normalize_phone_field(phone) or ""
    if not phone_norm and (phone or "").strip():
        # Normalizatsiya bo'lmasa ham raqamlarni saqlaymiz (qo'lda kiritilgan).
        digits = "".join(ch for ch in str(phone) if ch.isdigit())
        phone_norm = f"+{digits}" if digits else ""
    ch = channel if channel in BarberCustomerOutreach.Channel.values else (
        BarberCustomerOutreach.Channel.OTHER
    )
    if not name and not phone_norm:
        raise ValueError("Ism yoki telefon kerak.")
    return BarberCustomerOutreach.objects.create(
        barber=barber,
        full_name=name,
        phone=phone_norm,
        channel=ch,
        note=note_clean,
    )


def barber_invite_dashboard(barber: Barber, *, invites_limit: int = 50, outreach_limit: int = 50) -> dict:
    """Bitta so'rovda sartarosh kabineti uchun optimallashtirilgan payload."""
    code = ensure_barber_invite_code(barber)
    invites_qs = BarberCustomerInvite.objects.filter(barber=barber).order_by(
        "-created_at", "-id"
    )
    outreaches_qs = BarberCustomerOutreach.objects.filter(barber=barber).order_by(
        "-created_at", "-id"
    )
    counts = BarberCustomerOutreach.objects.filter(barber=barber).aggregate(
        outreach_total=Count("id"),
        outreach_pending=Count("id", filter=Q(status=BarberCustomerOutreach.Status.PENDING)),
        outreach_joined=Count("id", filter=Q(status=BarberCustomerOutreach.Status.JOINED)),
    )
    invite_count = invites_qs.count()
    invites = list(invites_qs[:invites_limit])
    outreaches = list(outreaches_qs[:outreach_limit])

    return {
        "code": code,
        "invite_url": build_barber_invite_url(code),
        "invite_count": invite_count,
        "outreach_total": counts["outreach_total"] or 0,
        "outreach_pending": counts["outreach_pending"] or 0,
        "outreach_joined": counts["outreach_joined"] or 0,
        "conversion_rate": (
            round((invite_count / counts["outreach_total"]) * 100, 1)
            if counts["outreach_total"]
            else None
        ),
        "invites": [_invite_payload(i) for i in invites],
        "outreaches": [_outreach_payload(o) for o in outreaches],
    }


def _invite_payload(invite: BarberCustomerInvite) -> dict:
    return {
        "id": invite.pk,
        "customer_id": invite.customer_id,
        "full_name": invite.customer_full_name or "Foydalanuvchi",
        "phone": invite.customer_phone or None,
        "source": invite.source,
        "code_used": invite.code_used,
        "joined_at": invite.created_at.isoformat() if invite.created_at else None,
        "outreach_id": invite.outreach_id,
    }


def _outreach_payload(row: BarberCustomerOutreach) -> dict:
    return {
        "id": row.pk,
        "full_name": row.full_name or "",
        "phone": row.phone or None,
        "channel": row.channel,
        "note": row.note or "",
        "status": row.status,
        "joined_customer_id": row.joined_customer_id,
        "joined_at": row.joined_at.isoformat() if row.joined_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def admin_invite_stats(*, days: int = 30) -> dict:
    """Admin panel umumiy ko'rsatkichlar — agregat so'rovlar."""
    from datetime import timedelta

    from django.db.models.functions import TruncDate

    now = timezone.now()
    since = now - timedelta(days=max(1, min(days, 365)))

    total_invites = BarberCustomerInvite.objects.count()
    invites_period = BarberCustomerInvite.objects.filter(created_at__gte=since).count()
    active_barbers = (
        BarberCustomerInvite.objects.values("barber_id").distinct().count()
    )
    outreaches_pending = BarberCustomerOutreach.objects.filter(
        status=BarberCustomerOutreach.Status.PENDING
    ).count()
    outreaches_total = BarberCustomerOutreach.objects.count()

    top_barbers = list(
        BarberCustomerInvite.objects.values(
            "barber_id",
            "barber__full_name",
            "barber__email",
            "barber__phone",
            "barber__customer_invite_code",
        )
        .annotate(invite_count=Count("id"))
        .order_by("-invite_count")[:20]
    )
    by_day = list(
        BarberCustomerInvite.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    by_source = list(
        BarberCustomerInvite.objects.values("source")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    return {
        "as_of": now.isoformat(),
        "period_days": days,
        "total_invites": total_invites,
        "invites_in_period": invites_period,
        "barbers_with_invites": active_barbers,
        "outreach_total": outreaches_total,
        "outreach_pending": outreaches_pending,
        "top_barbers": [
            {
                "barber_id": row["barber_id"],
                "full_name": row["barber__full_name"] or "",
                "email": row["barber__email"] or "",
                "phone": row["barber__phone"] or "",
                "invite_code": row["barber__customer_invite_code"] or "",
                "invite_count": row["invite_count"],
            }
            for row in top_barbers
        ],
        "by_day": [
            {
                "day": r["day"].isoformat() if r["day"] else None,
                "count": r["count"],
            }
            for r in by_day
        ],
        "by_source": [{"source": r["source"], "count": r["count"]} for r in by_source],
    }
