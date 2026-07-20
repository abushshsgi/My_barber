"""Morph AI / AI Style — generation usage yozuvlari."""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from django.db import transaction

logger = logging.getLogger(__name__)


def record_ai_generation(
    *,
    user_id: int | None,
    kind: str,
    status: str,
    prompt: str = "",
    style_id: str = "",
    style_title: str = "",
    model: str = "",
    provider: str = "",
    job_id: str = "",
    prompt_tokens: int = 0,
    candidates_tokens: int = 0,
    thoughts_tokens: int = 0,
    total_tokens: int = 0,
    cost_usd: Decimal | float | str = Decimal("0"),
    tokens_estimated: bool = False,
    latency_ms: int = 0,
    error_detail: str = "",
) -> Any | None:
    """Har bir AI chaqiruvni DB ga yozadi. Xato bo'lsa asosiy flow uzilmasin."""
    try:
        from ai.models import AiGenerationUsage

        cost = cost_usd if isinstance(cost_usd, Decimal) else Decimal(str(cost_usd or 0))
        with transaction.atomic():
            row = AiGenerationUsage.objects.create(
                user_id=user_id,
                kind=kind,
                status=status,
                prompt=(prompt or "")[:8000],
                style_id=(style_id or "")[:64],
                style_title=(style_title or "")[:120],
                model=(model or "")[:80],
                provider=(provider or "")[:32],
                job_id=(job_id or "")[:64],
                prompt_tokens=max(0, int(prompt_tokens or 0)),
                candidates_tokens=max(0, int(candidates_tokens or 0)),
                thoughts_tokens=max(0, int(thoughts_tokens or 0)),
                total_tokens=max(0, int(total_tokens or 0)),
                cost_usd=cost,
                tokens_estimated=bool(tokens_estimated),
                latency_ms=max(0, int(latency_ms or 0)),
                error_detail=(error_detail or "")[:500],
            )
        if status == "success" and user_id and kind in ("tryon", "studio"):
            try:
                from accounts.models import User
                from subscriptions.services import record_morph_usage

                user = User.objects.filter(pk=user_id).first()
                if user:
                    record_morph_usage(user=user, kind=kind)
            except Exception:
                logger.exception("Subscription usage yozilmadi (user=%s kind=%s)", user_id, kind)
        return row
    except Exception:
        logger.exception("AiGenerationUsage yozilmadi (user=%s kind=%s)", user_id, kind)
        return None