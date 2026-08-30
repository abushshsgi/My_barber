"""Mahsulot ko'rish / klik hisobi."""

from __future__ import annotations

from django.db.models import F
from django.utils import timezone

from ai.models import CareProduct, CareProductInsight


def record_product_event(product: CareProduct, user, *, kind: str) -> None:
    kind = (kind or "").strip().lower()
    if kind not in {"view", "click"}:
        return
    if kind == "view":
        CareProduct.objects.filter(pk=product.pk).update(views_count=F("views_count") + 1)
    else:
        CareProduct.objects.filter(pk=product.pk).update(clicks_count=F("clicks_count") + 1)

    if not getattr(user, "is_authenticated", False):
        return
    now = timezone.now()
    row, created = CareProductInsight.objects.get_or_create(
        user=user,
        product=product,
        defaults={
            "views": 1 if kind == "view" else 0,
            "clicks": 1 if kind == "click" else 0,
            "last_seen_at": now,
        },
    )
    if created:
        return
    if kind == "view":
        CareProductInsight.objects.filter(pk=row.pk).update(
            views=F("views") + 1,
            last_seen_at=now,
        )
    else:
        CareProductInsight.objects.filter(pk=row.pk).update(
            clicks=F("clicks") + 1,
            last_seen_at=now,
        )
