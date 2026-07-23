import hashlib
import hmac

from django.conf import settings


def _wallet_secret() -> bytes:
    raw = getattr(settings, "WALLET_HMAC_SECRET", None) or settings.SECRET_KEY
    return raw.encode("utf-8")


def _luhn_check_digit(number_without_check: str) -> str:
    digits = [int(d) for d in number_without_check if d.isdigit()]
    total = 0
    parity = len(digits) % 2
    for i, d in enumerate(digits):
        if i % 2 == parity:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return str((10 - (total % 10)) % 10)


def generate_wallet_number(user_id: int, *, attempt: int = 0) -> str:
    """Deterministic unique-ish number per user; attempt>0 for collision retry."""
    msg = f"user:{user_id}:attempt:{attempt}".encode("utf-8")
    digest = hmac.new(_wallet_secret(), msg, hashlib.sha256).hexdigest()
    body_digits = "".join(str(int(c, 16) % 10) for c in digest[:11])
    base15 = f"7700{body_digits}"
    check = _luhn_check_digit(base15)
    raw16 = base15 + check
    return format_wallet_number(raw16)


def format_wallet_number(raw16: str) -> str:
    raw = normalize_wallet_number(raw16)
    if len(raw) != 16:
        raise ValueError("Wallet number must be 16 digits.")
    return f"{raw[0:4]} {raw[4:8]} {raw[8:12]} {raw[12:16]}"


def normalize_wallet_number(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def card_display_from_wallet_number(wallet_number: str) -> str:
    raw = normalize_wallet_number(wallet_number)
    return f"•••• {raw[-4:]}"


def mask_wallet_number(wallet_number: str) -> str:
    """Chek / UI uchun: ****4444 (oxirgi 4 raqam)."""
    raw = normalize_wallet_number(wallet_number)
    if len(raw) < 4:
        return "****"
    return f"****{raw[-4:]}"


def generate_barber_account_number(barber_id: int, *, attempt: int = 0) -> str:
    """Sartarosh MySaloon hisob raqami (HMAC, Luhn). Prefiks 8800."""
    msg = f"barber:{barber_id}:attempt:{attempt}".encode("utf-8")
    digest = hmac.new(_wallet_secret(), msg, hashlib.sha256).hexdigest()
    body_digits = "".join(str(int(c, 16) % 10) for c in digest[:11])
    base15 = f"8800{body_digits}"
    check = _luhn_check_digit(base15)
    raw16 = base15 + check
    return format_wallet_number(raw16)


def account_hash(account_number: str) -> str:
    raw = normalize_wallet_number(account_number)
    return hmac.new(_wallet_secret(), f"acct:{raw}".encode("utf-8"), hashlib.sha256).hexdigest()
