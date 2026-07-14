import hashlib
import json
from decimal import Decimal, ROUND_HALF_UP

from wallet.models import LedgerEntry

GENESIS_HASH = "0" * 64


def _money_str(value: Decimal | int | str) -> str:
    """Hash uchun barqaror pul satri (har doim 2 kasr)."""
    quantized = Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return format(quantized, "f")


def canonical_entry_payload(
    *,
    wallet_id,
    entry_type: str,
    amount: Decimal,
    balance_after: Decimal,
    reference_type: str,
    reference_id: str,
    idempotency_key: str,
) -> dict:
    return {
        "wallet_id": str(wallet_id),
        "entry_type": entry_type,
        "amount": _money_str(amount),
        "balance_after": _money_str(balance_after),
        "reference_type": reference_type or "",
        "reference_id": reference_id or "",
        "idempotency_key": idempotency_key,
    }


def compute_entry_hash(prev_hash: str, payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(f"{prev_hash}{canonical}".encode("utf-8")).hexdigest()


def last_entry_hash(wallet_id) -> str:
    last = (
        LedgerEntry.objects.filter(wallet_id=wallet_id)
        .order_by("-created_at", "-pk")
        .only("entry_hash")
        .first()
    )
    return last.entry_hash if last else GENESIS_HASH


def verify_wallet_chain(wallet_id) -> tuple[bool, str | None]:
    entries = LedgerEntry.objects.filter(wallet_id=wallet_id).order_by("created_at", "pk")
    prev = GENESIS_HASH
    for entry in entries:
        if entry.prev_hash != prev:
            return False, f"Broken chain at {entry.id}: prev_hash mismatch"
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
        if entry.entry_hash != expected:
            return False, f"Broken chain at {entry.id}: entry_hash mismatch"
        prev = entry.entry_hash
    return True, None
