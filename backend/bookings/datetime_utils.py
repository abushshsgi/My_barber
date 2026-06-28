"""Sana oralig'ini API query parametrlaridan parse qilish (barber analitika / daromad)."""

from django.utils import timezone


def parse_range_datetime(raw: str, *, is_end: bool = False):
    """ISO yoki YYYY-MM-DD; sana-only end uchun mahalliy kun oxirigacha."""
    raw = (raw or "").strip()
    dt = timezone.datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    if is_end and len(raw) <= 10:
        dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return dt
