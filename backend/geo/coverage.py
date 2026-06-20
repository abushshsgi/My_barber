"""Viloyat bo'yicha nashr qilingan salonlar soni."""

from salons.models import Salon


def published_salon_count(region: str) -> int:
    region = (region or "").strip()
    if not region:
        return 0
    return Salon.objects.filter(is_published=True, owner_barber__region=region).count()
