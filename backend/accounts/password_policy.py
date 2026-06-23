"""Barber signup parol siyosati — frontend bilan mos (faqat uzunlik)."""

MIN_PASSWORD_LENGTH = 8


def validate_barber_password(raw: str) -> str | None:
    pwd = raw or ""
    if len(pwd) < MIN_PASSWORD_LENGTH:
        return "Parol kamida 8 belgidan iborat bo'lishi kerak."
    return None
