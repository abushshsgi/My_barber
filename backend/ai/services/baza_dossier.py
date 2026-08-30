"""Admin Baza — ekotizim qidiruvi va foydalanuvchi to‘liq dosye."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Count, Q, Sum

from accounts.models import User, UserAddress, UserSession
from ai.models import CareProduct, CareProductInsight, CareProductLike, Gs1CountryCode, HairCareProfile
from ai.services.country_flags import country_flag_payload


def _f(v) -> float:
    try:
        return float(Decimal(str(v or 0)))
    except Exception:
        return 0.0


def _iso(dt) -> str | None:
    if not dt:
        return None
    try:
        return dt.isoformat()
    except Exception:
        return None


def baza_overview() -> dict[str, Any]:
    from barbers.models import Barber
    from bookings.models import Booking
    from salons.models import Salon
    from wallet.models import GiftTransfer, LedgerEntry, Wallet

    return {
        "users": User.objects.count(),
        "users_active": User.objects.filter(is_active=True).count(),
        "barbers": Barber.objects.count(),
        "salons": Salon.objects.count(),
        "wallets": Wallet.objects.count(),
        "wallet_balance_sum": _f(Wallet.objects.aggregate(s=Sum("balance")).get("s")),
        "ledger_entries": LedgerEntry.objects.count(),
        "gifts": GiftTransfer.objects.count(),
        "bookings": Booking.objects.count(),
        "sessions": UserSession.objects.count(),
        "care_products": CareProduct.objects.count(),
        "care_likes": CareProductLike.objects.count(),
        "care_views": int(CareProduct.objects.aggregate(s=Sum("views_count")).get("s") or 0),
        "care_clicks": int(CareProduct.objects.aggregate(s=Sum("clicks_count")).get("s") or 0),
        "gs1_codes": Gs1CountryCode.objects.count(),
    }


LIST_LIMIT = 600
EXPORT_LIMIT = 8000


def baza_wallets(*, q: str = "", limit: int = LIST_LIMIT) -> list[dict[str, Any]]:
    from wallet.models import Wallet

    qs = Wallet.objects.select_related("user").order_by("-updated_at")
    q = (q or "").strip()
    if q:
        filt = (
            Q(wallet_number__icontains=q)
            | Q(user__full_name__icontains=q)
            | Q(user__phone__icontains=q)
            | Q(user__email__icontains=q)
        )
        if q.isdigit():
            filt = filt | Q(user_id=int(q))
        qs = qs.filter(filt)
    rows = []
    for w in qs[:limit]:
        u = w.user
        rows.append(
            {
                "wallet_id": w.id,
                "wallet_number": w.wallet_number,
                "balance": _f(w.balance),
                "is_frozen": w.is_frozen,
                "freeze_reason": w.freeze_reason or "",
                "user_id": u.id,
                "full_name": u.full_name,
                "phone": u.phone or "",
                "email": u.email,
                "updated_at": _iso(w.updated_at),
            }
        )
    return rows


def baza_users(*, q: str = "", limit: int = LIST_LIMIT) -> list[dict[str, Any]]:
    from wallet.models import Wallet

    qs = User.objects.order_by("-id")
    q = (q or "").strip()
    if q:
        filt = Q(full_name__icontains=q) | Q(phone__icontains=q) | Q(email__icontains=q) | Q(username__icontains=q)
        if q.isdigit():
            filt = filt | Q(pk=int(q))
        qs = qs.filter(filt)
    wallets = {
        w.user_id: w.wallet_number
        for w in Wallet.objects.filter(user_id__in=list(qs.values_list("id", flat=True)[:limit]))
    }
    return [
        {
            "user_id": u.id,
            "full_name": u.full_name,
            "phone": u.phone or "",
            "email": u.email,
            "username": u.username,
            "region": u.region,
            "is_active": u.is_active,
            "wallet_number": wallets.get(u.id, ""),
            "date_joined": _iso(u.date_joined),
        }
        for u in qs[:limit]
    ]


def baza_transactions(*, q: str = "", limit: int = LIST_LIMIT) -> list[dict[str, Any]]:
    from wallet.models import LedgerEntry

    qs = LedgerEntry.objects.select_related("wallet__user").order_by("-created_at")
    q = (q or "").strip()
    if q:
        filt = (
            Q(entry_hash__icontains=q)
            | Q(prev_hash__icontains=q)
            | Q(reference_id__icontains=q)
            | Q(idempotency_key__icontains=q)
            | Q(wallet__wallet_number__icontains=q)
            | Q(wallet__user__full_name__icontains=q)
            | Q(wallet__user__phone__icontains=q)
        )
        if q.isdigit():
            filt = filt | Q(wallet__user_id=int(q))
        qs = qs.filter(filt)
        if len(q) >= 8:
            try:
                from uuid import UUID

                qs = qs | LedgerEntry.objects.filter(id=UUID(q))
            except Exception:
                pass
    rows = []
    for e in qs[:limit]:
        u = e.wallet.user if e.wallet_id else None
        rows.append(
            {
                "id": str(e.id),
                "entry_type": e.entry_type,
                "amount": _f(e.amount),
                "balance_after": _f(e.balance_after),
                "reference_type": e.reference_type,
                "reference_id": e.reference_id,
                "entry_hash": e.entry_hash,
                "prev_hash": e.prev_hash,
                "wallet_number": e.wallet.wallet_number if e.wallet_id else "",
                "user_id": u.id if u else None,
                "full_name": (u.full_name if u else "") or "",
                "phone": (u.phone if u else "") or "",
                "created_at": _iso(e.created_at),
            }
        )
    return rows


def baza_hashes(*, q: str = "", limit: int = LIST_LIMIT) -> list[dict[str, Any]]:
    from wallet.models import LedgerEntry

    qs = LedgerEntry.objects.select_related("wallet__user").order_by("-created_at")
    q = (q or "").strip()
    if q:
        filt = Q(entry_hash__icontains=q) | Q(prev_hash__icontains=q) | Q(wallet__wallet_number__icontains=q)
        qs = qs.filter(filt)
        if len(q) >= 8:
            try:
                from uuid import UUID

                qs = qs | LedgerEntry.objects.filter(id=UUID(q))
            except Exception:
                pass
    rows = []
    for e in qs[:limit]:
        u = e.wallet.user if e.wallet_id else None
        rows.append(
            {
                "ledger_id": str(e.id),
                "entry_hash": e.entry_hash,
                "prev_hash": e.prev_hash,
                "wallet_number": e.wallet.wallet_number if e.wallet_id else "",
                "user_id": u.id if u else None,
                "full_name": (u.full_name if u else "") or "",
                "entry_type": e.entry_type,
                "created_at": _iso(e.created_at),
            }
        )
    return rows


def baza_dataset(kind: str, *, q: str = "", limit: int | None = None) -> dict[str, Any]:
    cap = limit if limit is not None else LIST_LIMIT
    kind = (kind or "").strip().lower()
    if kind == "wallets":
        results = baza_wallets(q=q, limit=cap)
    elif kind == "users":
        results = baza_users(q=q, limit=cap)
    elif kind == "transactions":
        results = baza_transactions(q=q, limit=cap)
    elif kind == "hashes":
        results = baza_hashes(q=q, limit=cap)
    else:
        results = []
    return {"kind": kind, "count": len(results), "results": results}


def baza_countries() -> list[dict[str, Any]]:
    rows = []
    for item in Gs1CountryCode.objects.all().order_by("prefix_start", "prefix_end"):
        flag = country_flag_payload(item.country_name)
        rows.append(
            {
                "id": item.id,
                "prefix_label": item.prefix_label,
                "prefix_start": item.prefix_start,
                "prefix_end": item.prefix_end,
                **flag,
            }
        )
    return rows


def baza_products(*, q: str = "", limit: int = 400) -> list[dict[str, Any]]:
    qs = CareProduct.objects.annotate(
        likes_count=Count("likes"),
        viewers_count=Count("insights", filter=Q(insights__views__gt=0)),
        clickers_count=Count("insights", filter=Q(insights__clicks__gt=0)),
    ).order_by("-views_count", "-clicks_count", "name")
    q = (q or "").strip()
    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Q(brand__icontains=q)
            | Q(barcode__icontains=q)
            | Q(ingredients_text__icontains=q)
            | Q(country_of_origin__icontains=q)
        )
    out = []
    for p in qs[:limit]:
        flag = country_flag_payload(p.country_of_origin)
        out.append(
            {
                "id": p.id,
                "name": p.name,
                "brand": p.brand,
                "category": p.category,
                "barcode": p.barcode or "",
                "country_of_origin": p.country_of_origin,
                "country_code_prefix": p.country_code_prefix,
                "flag": flag["flag"],
                "iso": flag["iso"],
                "ingredients_text": p.ingredients_text,
                "usage_uz": p.usage_uz,
                "views_count": int(p.views_count or 0),
                "clicks_count": int(p.clicks_count or 0),
                "viewers_count": int(p.viewers_count or 0),
                "clickers_count": int(p.clickers_count or 0),
                "likes_count": int(p.likes_count or 0),
                "is_published": p.is_published,
                "is_verified": p.is_verified,
            }
        )
    return out


def _user_ids_from_query(q: str) -> list[int]:
    q = (q or "").strip()
    if not q or len(q) < 2:
        return []
    ids: list[int] = []
    seen: set[int] = set()

    def add(uid):
        if uid and uid not in seen:
            seen.add(uid)
            ids.append(uid)

    if q.isdigit():
        add(int(q))

    for u in User.objects.filter(
        Q(full_name__icontains=q)
        | Q(phone__icontains=q)
        | Q(email__icontains=q)
        | Q(username__icontains=q)
        | Q(referral_code__iexact=q)
    )[:12]:
        add(u.pk)

    from wallet.models import GiftTransfer, LedgerEntry, Wallet

    for w in Wallet.objects.filter(wallet_number__icontains=q).select_related("user")[:8]:
        add(w.user_id)
    if len(q) >= 3:
        from control_panel.ledger_lookup import resolve_ledger_query

        payload = resolve_ledger_query(q)
        for hit in payload.get("results") or []:
            owner = hit.get("owner") or {}
            if owner.get("user_id"):
                add(owner["user_id"])
            sender = (owner.get("sender") or {}) if isinstance(owner, dict) else {}
            recipient = (owner.get("recipient") or {}) if isinstance(owner, dict) else {}
            add(sender.get("user_id"))
            add(recipient.get("user_id"))
            entry = hit.get("entry") or {}
            if entry.get("id"):
                le = LedgerEntry.objects.filter(pk=entry["id"]).select_related("wallet").first()
                if le:
                    add(le.wallet.user_id)
            if hit.get("kind") == "gift_transfer" and hit.get("primary_id"):
                gift = GiftTransfer.objects.filter(pk=hit["primary_id"]).select_related(
                    "sender_wallet", "recipient_wallet"
                ).first()
                if gift:
                    add(gift.sender_wallet.user_id)
                    add(gift.recipient_wallet.user_id)

    for p in CareProduct.objects.filter(Q(barcode__iexact=q) | Q(name__icontains=q))[:5]:
        for uid in CareProductInsight.objects.filter(product=p).values_list("user_id", flat=True)[:20]:
            add(uid)
        for uid in CareProductLike.objects.filter(product=p).values_list("user_id", flat=True)[:20]:
            add(uid)

    return ids[:8]


def build_user_dossier(user: User) -> dict[str, Any]:
    from barbers.models import Barber, BarberProfile
    from bookings.models import Booking
    from wallet.models import GiftTransfer, LedgerEntry, Wallet

    wallet = Wallet.objects.filter(user=user).first()
    profile = HairCareProfile.objects.filter(user=user).first()
    barber_profile = BarberProfile.objects.filter(user=user).select_related("barber").first()
    barber = barber_profile.barber if barber_profile else Barber.objects.filter(phone=user.phone).first()

    addresses = [
        {
            "id": a.id,
            "label": a.label,
            "custom_label": a.custom_label,
            "address_line": a.address_line,
            "region": a.region,
            "latitude": str(a.latitude) if a.latitude is not None else None,
            "longitude": str(a.longitude) if a.longitude is not None else None,
            "is_default": a.is_default,
        }
        for a in UserAddress.objects.filter(user=user)[:20]
    ]
    devices = [
        {
            "id": s.id,
            "device_name": s.device_name,
            "platform": s.platform,
            "client_kind": s.client_kind,
            "app_version": s.app_version,
            "ip_address": s.ip_address,
            "user_agent": (s.user_agent or "")[:180],
            "last_seen_at": _iso(s.last_seen_at),
            "revoked_at": _iso(s.revoked_at),
        }
        for s in UserSession.objects.filter(user=user)[:30]
    ]
    ledger = []
    if wallet:
        ledger = [
            {
                "id": str(e.id),
                "entry_type": e.entry_type,
                "amount": _f(e.amount),
                "balance_after": _f(e.balance_after),
                "reference_type": e.reference_type,
                "reference_id": e.reference_id,
                "created_at": _iso(e.created_at),
            }
            for e in LedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")[:80]
        ]
    gifts = []
    if wallet:
        for g in GiftTransfer.objects.filter(
            Q(sender_wallet=wallet) | Q(recipient_wallet=wallet)
        ).select_related("sender_wallet__user", "recipient_wallet__user").order_by("-created_at")[:40]:
            gifts.append(
                {
                    "id": str(g.id),
                    "amount": _f(g.amount),
                    "status": g.status,
                    "direction": "out" if g.sender_wallet_id == wallet.id else "in",
                    "from_user": g.sender_wallet.user.full_name if g.sender_wallet_id else "",
                    "to_user": g.recipient_wallet.user.full_name if g.recipient_wallet_id else "",
                    "from_wallet": g.sender_wallet.wallet_number if g.sender_wallet_id else "",
                    "to_wallet": g.recipient_wallet.wallet_number if g.recipient_wallet_id else "",
                    "created_at": _iso(getattr(g, "created_at", None)),
                }
            )
    bookings = [
        {
            "id": b.id,
            "status": b.status,
            "payment_status": b.payment_status,
            "total_price": _f(b.total_price),
            "barber_id": b.barber_id,
            "salon_id": b.salon_id,
            "start_at": _iso(b.start_at),
        }
        for b in Booking.objects.filter(customer=user).order_by("-start_at")[:40]
    ]
    likes = [
        {
            "product_id": row.product_id,
            "product_name": row.product.name,
            "brand": row.product.brand,
            "liked_at": _iso(row.created_at),
        }
        for row in CareProductLike.objects.filter(user=user).select_related("product")[:50]
    ]
    seen = [
        {
            "product_id": row.product_id,
            "product_name": row.product.name,
            "brand": row.product.brand,
            "views": row.views,
            "clicks": row.clicks,
            "last_seen_at": _iso(row.last_seen_at),
        }
        for row in CareProductInsight.objects.filter(user=user).select_related("product").order_by("-last_seen_at")[:50]
    ]
    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "phone": user.phone,
            "email": user.email,
            "username": user.username,
            "region": user.region,
            "is_active": user.is_active,
            "date_joined": _iso(user.date_joined),
            "last_login": _iso(user.last_login),
            "latitude": str(user.latitude) if user.latitude is not None else None,
            "longitude": str(user.longitude) if user.longitude is not None else None,
            "referral_code": user.referral_code,
        },
        "hair_profile": (
            {
                "condition": profile.condition,
                "texture": profile.texture,
                "color_status": profile.color_status,
                "scalp": profile.scalp,
                "complete": profile.is_complete,
            }
            if profile
            else None
        ),
        "wallet": (
            {
                "id": wallet.id,
                "wallet_number": wallet.wallet_number,
                "balance": _f(wallet.balance),
                "is_frozen": wallet.is_frozen,
                "freeze_reason": wallet.freeze_reason,
            }
            if wallet
            else None
        ),
        "barber": (
            {
                "id": barber.id,
                "full_name": getattr(barber, "full_name", "") or "",
                "phone": getattr(barber, "phone", "") or "",
            }
            if barber
            else None
        ),
        "addresses": addresses,
        "devices": devices,
        "transactions": ledger,
        "gifts": gifts,
        "bookings": bookings,
        "liked_products": likes,
        "seen_products": seen,
    }


def baza_search(q: str) -> dict[str, Any]:
    q = (q or "").strip()
    ledger = None
    if len(q) >= 3:
        from control_panel.ledger_lookup import resolve_ledger_query

        ledger = resolve_ledger_query(q)
    user_ids = _user_ids_from_query(q)
    dossiers = []
    for uid in user_ids:
        user = User.objects.filter(pk=uid).first()
        if user:
            dossiers.append(build_user_dossier(user))
    countries = []
    products = []
    if q:
        countries = [
            {**country_flag_payload(c.country_name), "prefix_label": c.prefix_label}
            for c in Gs1CountryCode.objects.filter(
                Q(prefix_label__icontains=q) | Q(country_name__icontains=q)
            )[:20]
        ]
        products = baza_products(q=q, limit=20)
    return {
        "ok": bool(dossiers or (ledger and ledger.get("ok")) or countries or products),
        "query": q,
        "ledger": ledger,
        "dossiers": dossiers,
        "countries": countries,
        "products": products,
    }
