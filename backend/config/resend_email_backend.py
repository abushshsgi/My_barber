"""
HTTP orqali email yuborish (Resend). Railway va boshqa hostlarda SMTP portlariga
TCP timeout bo‘lganda SMTP o‘rniga ishlatiladi — faqat 443 HTTPS.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from email.utils import parseaddr
from smtplib import SMTPException
from typing import Any

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.mail.message import EmailMessage

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _addr_only(addr: str) -> str:
    """'Name <a@b.com>' yoki 'a@b.com' → 'a@b.com'."""
    _, email = parseaddr(addr)
    return email or addr.strip()


def _message_to_resend_payload(message: EmailMessage) -> dict[str, Any]:
    from_display = (message.from_email or settings.DEFAULT_FROM_EMAIL).strip()
    if not message.to:
        raise ValueError("Recipient list is empty.")

    payload: dict[str, Any] = {
        "from": from_display,
        "to": [_addr_only(x) for x in message.to],
        "subject": message.subject or "(no subject)",
    }
    if message.cc:
        payload["cc"] = [_addr_only(x) for x in message.cc]
    if message.bcc:
        payload["bcc"] = [_addr_only(x) for x in message.bcc]

    body = message.body or ""
    html_parts: list[str] = []
    for content, ctype in getattr(message, "alternatives", None) or []:
        if ctype == "text/html" and content:
            html_parts.append(content)
    html = html_parts[-1] if html_parts else ""
    if html:
        payload["html"] = html
    payload["text"] = body.strip() if body.strip() else (html[:10000] if html else " ")

    if message.attachments:
        raise ValueError("Resend backend: attachments are not implemented; use SMTP or extend backend.")

    return payload


class ResendEmailBackend(BaseEmailBackend):
    """django.core.mail orqali yuboriladigan xabarlar → Resend REST API."""

    def send_messages(self, email_messages: list[EmailMessage]) -> int:
        key = (getattr(settings, "RESEND_API_KEY", None) or "").strip()
        if not key:
            logger.error("ResendEmailBackend: RESEND_API_KEY bo‘sh")
            return 0

        num_sent = 0
        for message in email_messages:
            try:
                payload = _message_to_resend_payload(message)
            except ValueError as exc:
                if not self.fail_silently:
                    raise SMTPException(str(exc)) from exc
                logger.warning("Resend skip: %s", exc)
                continue

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                RESEND_API_URL,
                data=data,
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=25) as resp:
                    resp.read()
                    code = resp.getcode()
                if 200 <= code < 300:
                    num_sent += 1
            except urllib.error.HTTPError as e:
                detail = e.read().decode(errors="replace")[:600]
                err = f"Resend HTTP {e.code}: {detail}"
                logger.error("Resend email failed: %s", err)
                if not self.fail_silently:
                    raise SMTPException(err) from e
            except OSError as e:
                logger.error("Resend network error: %s", e)
                if not self.fail_silently:
                    raise SMTPException(str(e)) from e

        return num_sent
