"""Barber signup parol siyosati — frontend bilan mos."""

import re

MIN_PASSWORD_LENGTH = 8


def validate_barber_password(raw: str) -> str | None:
    pwd = raw or ""
    if len(pwd) < MIN_PASSWORD_LENGTH:
        return "Parol kamida 8 belgidan iborat bo'lishi kerak."
    has_digit = bool(re.search(r"\d", pwd))
    has_mixed_case = bool(re.search(r"[A-Z]", pwd)) and bool(re.search(r"[a-z]", pwd))
    if not (has_digit or has_mixed_case):
        return "Parol kamida bitta raqam yoki katta+kichik harf bo'lishi kerak."
    return None
