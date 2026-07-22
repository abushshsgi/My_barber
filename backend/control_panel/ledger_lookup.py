"""Admin tez qidiruv: ledger id, hash, merchant id, gift, deposit, wallet."""

from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from django.db.models import Q

from wallet.models import GiftTransfer, LedgerEntry, ManualCardDeposit, Wallet
from wallet.services.ledger import (
    GENESIS_HASH,
    canonical_entry_payload,
    compute_entry_hash,
    verify_wallet_chain,
)


ENTRY_LABELS = {
    "topup": "Hamyon to'ldirish",
    "gift_out": "Sovg'a yuborildi",
    "gift_in": "Sovg'a qabul qilindi",
    "gift_design_fee": "Sovg'a dizayn to'lovi",
    "booking_pay": "Bron to'lovi",
    "subscription": "Obuna",
    "refund": "Qaytarim",
    "adjustment": "Tuzatish",
}

REF_LABELS = {
    "gift_hold": "Admin · sovg'a hold",
    "gift_release": "Admin · hold ochildi",
    "gift_refund": "Admin · sovg'a refund",
    "gift_refund_fee": "Admin · dizayn refund",
    "admin_adjust": "Admin · manual tuzatish",
    "subscription": "Obuna merchant",
    "booking": "Bron",
    "gift": "Sovg'a",
}


def _float(v) -> float:
    try:
        return float(Decimal(str(v or 0)))
    except Exception:
        return 0.0


def _user_brief(user) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "user_id": user.pk,
        "name": (user.full_name or user.phone or str(user.pk)).strip(),
        "phone": user.phone or None,
    }


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False


def _entry_dict(entry: LedgerEntry, *, highlight: bool = False) -> dict[str, Any]:
    meta = entry.metadata or {}
    return {
        "id": str(entry.id),
        "entry_type": entry.entry_type,
        "entry_type_label": ENTRY_LABELS.get(entry.entry_type, entry.entry_type),
        "amount": _float(entry.amount),
        "balance_after": _float(entry.balance_after),
        "reference_type": entry.reference_type or "",
        "reference_type_label": REF_LABELS.get(entry.reference_type or "", entry.reference_type or "—"),
        "reference_id": entry.reference_id or "",
        "idempotency_key": entry.idempotency_key or "",
        "prev_hash": entry.prev_hash or "",
        "entry_hash": entry.entry_hash or "",
        "metadata": meta,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "highlight": highlight,
        "admin_reason": (meta.get("reason") if isinstance(meta.get("reason"), str) else None),
        "admin_action": (meta.get("action") if isinstance(meta.get("action"), str) else None),
    }


def _build_chain(wallet: Wallet, *, focus_entry_id: str | None = None) -> dict[str, Any]:
    ok, err = verify_wallet_chain(wallet.pk)
    entries = list(
        LedgerEntry.objects.filter(wallet=wallet).order_by("created_at", "pk")
    )
    steps: list[dict[str, Any]] = []
    prev = GENESIS_HASH
    broken_at: str | None = None
    for idx, entry in enumerate(entries, start=1):
        payload = canonical_entry_payload(
            wallet_id=entry.wallet_id,
            entry_type=entry.entry_type,
            amount=entry.amount,
            balance_after=entry.balance_after,
            reference_type=entry.reference_type,
            reference_id=entry.reference_id,
            idempotency_key=entry.idempotency_key,
        )
        expected = compute_entry_hash(prev, payload)
        link_ok = entry.prev_hash == prev and entry.entry_hash == expected
        if not link_ok and broken_at is None:
            broken_at = str(entry.id)
        steps.append(
            {
                "index": idx,
                "id": str(entry.id),
                "entry_type": entry.entry_type,
                "entry_type_label": ENTRY_LABELS.get(entry.entry_type, entry.entry_type),
                "amount": _float(entry.amount),
                "entry_hash": (entry.entry_hash or "")[:16],
                "entry_hash_full": entry.entry_hash or "",
                "prev_hash": (entry.prev_hash or "")[:16],
                "ok": link_ok,
                "focus": focus_entry_id is not None and str(entry.id) == str(focus_entry_id),
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
        )
        prev = entry.entry_hash
    return {
        "ok": bool(ok),
        "error": err,
        "broken_at": broken_at,
        "wallet_id": wallet.pk,
        "wallet_number": wallet.wallet_number,
        "balance": _float(wallet.balance),
        "entry_count": len(steps),
        "steps": steps[-40:],  # UI uchun oxirgi 40
        "steps_total": len(steps),
        "truncated": len(steps) > 40,
    }


def _links_for_entry(entry: LedgerEntry) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    user = entry.wallet.user if entry.wallet_id else None
    if user:
        links.append(
            {
                "label": "Mijoz profili",
                "href": f"/admin/users/{user.pk}",
            }
        )
    links.append(
        {
            "label": "Hamyon oqimi",
            "href": "/admin/statistics/wallet",
        }
    )
    ref = (entry.reference_type or "").strip()
    rid = (entry.reference_id or "").strip()
    if ref.startswith("gift") or entry.entry_type.startswith("gift"):
        gift_id = rid if _is_uuid(rid) else None
        meta = entry.metadata or {}
        if not gift_id and isinstance(meta.get("gift_id"), str) and _is_uuid(meta["gift_id"]):
            gift_id = meta["gift_id"]
        if gift_id:
            links.insert(
                0,
                {
                    "label": "Sovg'a sahifasi",
                    "href": f"/admin/finance/gifts?q={gift_id}",
                },
            )
    if entry.entry_type == "booking_pay" and rid.isdigit():
        links.insert(0, {"label": "Bron", "href": f"/admin/bookings/{rid}"})
    if entry.entry_type == "subscription" or ref == "subscription":
        links.append({"label": "Obunalar", "href": "/admin/subscriptions"})
    if ref in ("card_deposit", "card_manual") or (
        isinstance((entry.metadata or {}).get("source"), str)
        and "card" in str((entry.metadata or {}).get("source"))
    ):
        links.insert(0, {"label": "Karta to'ldirish", "href": "/admin/finance/deposits"})
    return links


def suggest_ledger_query(q: str, *, limit: int = 8) -> list[dict[str, Any]]:
    raw = (q or "").strip()
    if len(raw) < 3:
        return []

    out: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add(item: dict[str, Any]) -> None:
        key = f"{item.get('kind')}:{item.get('value')}"
        if key in seen or len(out) >= limit:
            return
        seen.add(key)
        out.append(item)

    # Exact-ish ledger by id / hash / reference
    if _is_uuid(raw):
        entry = (
            LedgerEntry.objects.select_related("wallet__user")
            .filter(pk=raw)
            .first()
        )
        if entry:
            user = entry.wallet.user
            add(
                {
                    "kind": "ledger_entry",
                    "kind_label": "Ledger yozuv",
                    "value": str(entry.id),
                    "title": ENTRY_LABELS.get(entry.entry_type, entry.entry_type),
                    "subtitle": f"{(user.full_name if user else '—')} · {entry.wallet.wallet_number}",
                }
            )
        gift = GiftTransfer.objects.select_related(
            "sender_wallet__user", "recipient_wallet__user"
        ).filter(pk=raw).first()
        if gift:
            add(
                {
                    "kind": "gift_transfer",
                    "kind_label": "Sovg'a",
                    "value": str(gift.id),
                    "title": f"Sovg'a · {_float(gift.amount):,.0f}".replace(",", " "),
                    "subtitle": gift.status,
                }
            )
        dep = ManualCardDeposit.objects.select_related("user").filter(pk=raw).first()
        if dep:
            add(
                {
                    "kind": "card_deposit",
                    "kind_label": "Karta to'ldirish",
                    "value": str(dep.id),
                    "title": f"Deposit · {_float(dep.amount):,.0f}".replace(",", " "),
                    "subtitle": dep.status,
                }
            )

    hash_qs = (
        LedgerEntry.objects.select_related("wallet__user")
        .filter(Q(entry_hash__istartswith=raw) | Q(prev_hash__istartswith=raw))
        .order_by("-created_at")[:5]
    )
    for entry in hash_qs:
        user = entry.wallet.user
        add(
            {
                "kind": "ledger_hash",
                "kind_label": "Hash",
                "value": entry.entry_hash,
                "title": f"hash · {ENTRY_LABELS.get(entry.entry_type, entry.entry_type)}",
                "subtitle": f"{(user.full_name if user else '—')} · {(entry.entry_hash or '')[:12]}…",
            }
        )

    ref_qs = (
        LedgerEntry.objects.select_related("wallet__user")
        .filter(
            Q(reference_id__icontains=raw)
            | Q(idempotency_key__icontains=raw)
        )
        .order_by("-created_at")[:5]
    )
    for entry in ref_qs:
        user = entry.wallet.user
        add(
            {
                "kind": "merchant_id",
                "kind_label": "Merchant ID",
                "value": entry.reference_id or entry.idempotency_key,
                "title": REF_LABELS.get(entry.reference_type, entry.reference_type or "Merchant"),
                "subtitle": f"{(user.full_name if user else '—')} · {entry.reference_id or entry.idempotency_key}",
            }
        )

    wallets = Wallet.objects.select_related("user").filter(
        Q(wallet_number__icontains=raw.replace(" ", ""))
        | Q(user__phone__icontains=raw)
        | Q(user__full_name__icontains=raw)
    )[:4]
    for w in wallets:
        add(
            {
                "kind": "wallet",
                "kind_label": "Hamyon",
                "value": w.wallet_number,
                "title": w.wallet_number,
                "subtitle": (w.user.full_name or w.user.phone or str(w.user_id)),
            }
        )

    deps = ManualCardDeposit.objects.select_related("user").filter(
        Q(transaction_ref__icontains=raw) | Q(merchant_ref__icontains=raw)
    ).order_by("-created_at")[:3]
    for d in deps:
        add(
            {
                "kind": "card_deposit",
                "kind_label": "Karta to'ldirish",
                "value": d.transaction_ref or str(d.id),
                "title": d.transaction_ref or str(d.id),
                "subtitle": f"{d.status} · {(d.user.full_name if d.user_id else '—')}",
            }
        )

    return out


def resolve_ledger_query(q: str) -> dict[str, Any]:
    raw = (q or "").strip()
    if not raw:
        return {"ok": False, "detail": "Qidiruv bo'sh.", "results": []}

    results: list[dict[str, Any]] = []

    # 1) Ledger entry by PK
    if _is_uuid(raw):
        entry = (
            LedgerEntry.objects.select_related("wallet__user")
            .filter(pk=raw)
            .first()
        )
        if entry:
            results.append(_pack_entry_hit(entry, match_field="yozuv_id", query=raw))

        gift = (
            GiftTransfer.objects.select_related(
                "sender_wallet__user",
                "recipient_wallet__user",
                "sender_entry",
                "recipient_entry",
                "design_fee_entry",
            )
            .filter(pk=raw)
            .first()
        )
        if gift:
            results.append(_pack_gift_hit(gift, query=raw))

        dep = (
            ManualCardDeposit.objects.select_related("user", "wallet", "ledger_entry")
            .filter(pk=raw)
            .first()
        )
        if dep:
            results.append(_pack_deposit_hit(dep, query=raw))

    # 2) Hash
    by_hash = (
        LedgerEntry.objects.select_related("wallet__user")
        .filter(Q(entry_hash__iexact=raw) | Q(entry_hash__istartswith=raw))
        .order_by("-created_at")[:5]
    )
    for entry in by_hash:
        results.append(_pack_entry_hit(entry, match_field="hash", query=raw))

    # 3) Merchant / reference / idempotency
    by_ref = (
        LedgerEntry.objects.select_related("wallet__user")
        .filter(Q(reference_id__iexact=raw) | Q(idempotency_key__iexact=raw) | Q(reference_id__icontains=raw))
        .order_by("-created_at")[:8]
    )
    for entry in by_ref:
        results.append(_pack_entry_hit(entry, match_field="merchant_id", query=raw))

    # 4) Gift by idempotency (UUID already handled above)
    gifts = GiftTransfer.objects.select_related(
        "sender_wallet__user", "recipient_wallet__user"
    ).filter(idempotency_key__icontains=raw)[:3]
    for gift in gifts:
        results.append(_pack_gift_hit(gift, query=raw))

    # 5) Deposits by refs
    deps = ManualCardDeposit.objects.select_related("user", "wallet", "ledger_entry").filter(
        Q(transaction_ref__icontains=raw) | Q(merchant_ref__icontains=raw)
    )[:5]
    for dep in deps:
        results.append(_pack_deposit_hit(dep, query=raw))

    # 6) Wallet number
    digits = raw.replace(" ", "")
    wallets = Wallet.objects.select_related("user").filter(
        Q(wallet_number__iexact=digits) | Q(wallet_number__icontains=digits)
    )[:3]
    for w in wallets:
        results.append(_pack_wallet_hit(w, query=raw))

    # Dedupe by kind+primary id
    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in results:
        key = f"{row.get('kind')}:{row.get('primary_id')}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    if not deduped:
        return {
            "ok": False,
            "query": raw,
            "detail": "Hech narsa topilmadi. UUID, hash, merchant ID yoki hamyon raqamini tekshiring.",
            "results": [],
        }

    return {
        "ok": True,
        "query": raw,
        "count": len(deduped),
        "results": deduped[:12],
    }


def _pack_entry_hit(entry: LedgerEntry, *, match_field: str, query: str) -> dict[str, Any]:
    user = entry.wallet.user if entry.wallet_id else None
    chain = _build_chain(entry.wallet, focus_entry_id=str(entry.id))
    related = list(
        LedgerEntry.objects.filter(wallet=entry.wallet)
        .order_by("-created_at")[:8]
    )
    return {
        "kind": "ledger_entry",
        "kind_label": "Ledger tranzaksiya",
        "match_field": match_field,
        "match_explain": {
            "yozuv_id": "Bu to'g'ridan-to'g'ri ledger yozuv UUID (chekdagi Yozuv ID).",
            "hash": "Bu ledger muhri (hash) — zanjirdagi yozuvning o'zgarmas imzosi.",
            "merchant_id": "Bu merchant / reference ID — biznes identifikator (obuna, sovg'a, hold…).",
        }.get(match_field, "Moslik topildi."),
        "primary_id": str(entry.id),
        "title": ENTRY_LABELS.get(entry.entry_type, entry.entry_type),
        "subtitle": REF_LABELS.get(entry.reference_type, entry.reference_type or ""),
        "query": query,
        "owner": {
            **(_user_brief(user) or {}),
            "wallet_number": entry.wallet.wallet_number,
            "wallet_id": entry.wallet_id,
            "balance": _float(entry.wallet.balance),
        },
        "entry": _entry_dict(entry, highlight=True),
        "related_entries": [_entry_dict(e) for e in related],
        "chain": chain,
        "links": _links_for_entry(entry),
    }


def _pack_gift_hit(gift: GiftTransfer, *, query: str) -> dict[str, Any]:
    sender = gift.sender_wallet.user if gift.sender_wallet_id else None
    recipient = gift.recipient_wallet.user if gift.recipient_wallet_id else None
    focus = gift.sender_entry or gift.recipient_entry
    chain = None
    if gift.sender_wallet_id:
        chain = _build_chain(
            gift.sender_wallet,
            focus_entry_id=str(gift.sender_entry_id) if gift.sender_entry_id else None,
        )
    recipient_chain = None
    if gift.recipient_wallet_id:
        recipient_chain = _build_chain(
            gift.recipient_wallet,
            focus_entry_id=str(gift.recipient_entry_id) if gift.recipient_entry_id else None,
        )
    return {
        "kind": "gift_transfer",
        "kind_label": "Sovg'a o'tkazmasi",
        "match_field": "gift_id",
        "match_explain": "Bu sovg'a transfer UUID / merchant ID. Hold, refund va zanjir shu yerda.",
        "primary_id": str(gift.id),
        "title": f"Sovg'a · {_float(gift.amount):,.0f} so'm".replace(",", " "),
        "subtitle": f"status: {gift.status}",
        "query": query,
        "owner": {
            "sender": _user_brief(sender),
            "recipient": _user_brief(recipient),
            "sender_wallet": gift.sender_wallet.wallet_number if gift.sender_wallet_id else None,
            "recipient_wallet": (
                gift.recipient_wallet.wallet_number if gift.recipient_wallet_id else None
            ),
        },
        "gift": {
            "id": str(gift.id),
            "status": gift.status,
            "amount": _float(gift.amount),
            "design_id": gift.design_id,
            "design_fee": _float(gift.design_fee),
            "held_amount": _float(getattr(gift, "held_amount", 0) or 0),
            "admin_note": getattr(gift, "admin_note", "") or "",
            "remediation_log": list(getattr(gift, "remediation_log", None) or []),
            "created_at": gift.created_at.isoformat() if gift.created_at else None,
        },
        "entry": _entry_dict(focus, highlight=True) if focus else None,
        "chain": chain,
        "recipient_chain": recipient_chain,
        "links": [
            {"label": "Sovg'a oqimi", "href": f"/admin/finance/gifts?q={gift.id}"},
            {
                "label": "Yuboruvchi",
                "href": f"/admin/users/{sender.pk}" if sender else "/admin/users",
            },
            {
                "label": "Qabul qiluvchi",
                "href": f"/admin/users/{recipient.pk}" if recipient else "/admin/users",
            },
        ],
    }


def _pack_deposit_hit(dep: ManualCardDeposit, *, query: str) -> dict[str, Any]:
    entry = dep.ledger_entry
    chain = None
    if dep.wallet_id:
        chain = _build_chain(
            dep.wallet,
            focus_entry_id=str(entry.id) if entry else None,
        )
    return {
        "kind": "card_deposit",
        "kind_label": "Karta to'ldirish",
        "match_field": "deposit_ref",
        "match_explain": "Bu karta to'ldirish merchant/tranzaksiya raqami yoki deposit ID.",
        "primary_id": str(dep.id),
        "title": f"Deposit · {_float(dep.amount):,.0f} so'm".replace(",", " "),
        "subtitle": f"status: {dep.status} · ref: {dep.transaction_ref}",
        "query": query,
        "owner": {
            **(_user_brief(dep.user) or {}),
            "wallet_number": dep.wallet.wallet_number if dep.wallet_id else None,
        },
        "deposit": {
            "id": str(dep.id),
            "status": dep.status,
            "amount": _float(dep.amount),
            "transaction_ref": dep.transaction_ref,
            "merchant_ref": getattr(dep, "merchant_ref", "") or "",
            "created_at": dep.created_at.isoformat() if dep.created_at else None,
        },
        "entry": _entry_dict(entry, highlight=True) if entry else None,
        "chain": chain,
        "links": [
            {"label": "Karta to'ldirish", "href": "/admin/finance/deposits"},
            {
                "label": "Mijoz",
                "href": f"/admin/users/{dep.user_id}" if dep.user_id else "/admin/users",
            },
        ],
    }


def _pack_wallet_hit(wallet: Wallet, *, query: str) -> dict[str, Any]:
    chain = _build_chain(wallet)
    recent = list(
        LedgerEntry.objects.filter(wallet=wallet).order_by("-created_at")[:10]
    )
    return {
        "kind": "wallet",
        "kind_label": "Hamyon",
        "match_field": "wallet_number",
        "match_explain": "Bu Mysaloon hamyon raqami. Pastda to'liq hash zanjiri.",
        "primary_id": str(wallet.pk),
        "title": wallet.wallet_number,
        "subtitle": f"balans: {_float(wallet.balance):,.0f} so'm".replace(",", " "),
        "query": query,
        "owner": {
            **(_user_brief(wallet.user) or {}),
            "wallet_number": wallet.wallet_number,
            "wallet_id": wallet.pk,
            "balance": _float(wallet.balance),
        },
        "entry": None,
        "related_entries": [_entry_dict(e) for e in recent],
        "chain": chain,
        "links": [
            {
                "label": "Mijoz profili",
                "href": f"/admin/users/{wallet.user_id}",
            },
            {"label": "Hamyon oqimi", "href": "/admin/statistics/wallet"},
        ],
    }
