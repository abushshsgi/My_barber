from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone

PRESETS = (
    "today",
    "yesterday",
    "days_ago_3",
    "days_ago_7",
    "last_7_days",
    "last_30_days",
    "last_90_days",
    "custom",
)

LABELS = {
    "today": "Bugun",
    "yesterday": "Kecha",
    "days_ago_3": "3 kun oldin",
    "days_ago_7": "7 kun oldin",
    "last_7_days": "So'nggi 7 kun",
    "last_30_days": "So'nggi 30 kun",
    "last_90_days": "So'nggi 90 kun",
    "custom": "Tanlangan oralig'",
}


@dataclass(frozen=True)
class Period:
    key: str
    label: str
    start: datetime
    end: datetime
    previous_start: datetime
    previous_end: datetime
    previous_label: str
    comparison: str

    def as_dict(self) -> dict:
        return {
            "key": self.key,
            "label": self.label,
            "start": self.start.isoformat(),
            "end": self.end.isoformat(),
            "previous_start": self.previous_start.isoformat(),
            "previous_end": self.previous_end.isoformat(),
            "previous_label": self.previous_label,
            "comparison": self.comparison,
        }


def _aware(day, tz):
    return timezone.make_aware(datetime.combine(day, time.min), tz)


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def resolve_period(preset: str | None, start: str | None = None, end: str | None = None, now=None) -> Period:
    current = timezone.localtime(now or timezone.now())
    tz = timezone.get_current_timezone()
    today = current.date()
    key = preset if preset in PRESETS else "last_7_days"

    def full_day(day, label, previous_day, previous_label, comparison):
        start_at = _aware(day, tz)
        end_at = _aware(day + timedelta(days=1), tz)
        prev_start = _aware(previous_day, tz)
        prev_end = _aware(previous_day + timedelta(days=1), tz)
        return Period(key, label, start_at, end_at, prev_start, prev_end, previous_label, comparison)

    if key == "today":
        start_at = _aware(today, tz)
        end_at = current
        elapsed = end_at - start_at
        prev_start = start_at - timedelta(days=1)
        return Period(
            key,
            LABELS[key],
            start_at,
            end_at,
            prev_start,
            prev_start + elapsed,
            "Kecha, shu vaqtgacha",
            "elapsed_clock",
        )
    if key == "yesterday":
        day = today - timedelta(days=1)
        return full_day(day, LABELS[key], day - timedelta(days=1), "Undan oldingi kun", "full_day")
    if key == "days_ago_3":
        day = today - timedelta(days=3)
        return full_day(day, LABELS[key], day - timedelta(days=1), "Undan oldingi kun", "full_day")
    if key == "days_ago_7":
        day = today - timedelta(days=7)
        return full_day(day, LABELS[key], day - timedelta(days=1), "Undan oldingi kun", "full_day")
    if key == "custom":
        start_day = _parse_date(start) or (today - timedelta(days=6))
        end_day = _parse_date(end) or today
        if end_day < start_day:
            start_day, end_day = end_day, start_day
        if (end_day - start_day).days > 366:
            start_day = end_day - timedelta(days=366)
        start_at = _aware(start_day, tz)
        end_at = _aware(end_day + timedelta(days=1), tz)
        length = end_at - start_at
        return Period(
            key,
            LABELS[key],
            start_at,
            end_at,
            start_at - length,
            start_at,
            "Oldingi teng oralig'",
            "equal_length",
        )
    days = {"last_7_days": 7, "last_30_days": 30, "last_90_days": 90}[key]
    start_at = _aware(today - timedelta(days=days - 1), tz)
    end_at = current
    length = end_at - start_at
    return Period(
        key,
        LABELS[key],
        start_at,
        end_at,
        start_at - length,
        start_at,
        "Oldingi teng oralig'",
        "equal_length",
    )


def local_day_bounds(day, tz=None):
    tz = tz or timezone.get_current_timezone()
    start = _aware(day, tz)
    return start, _aware(day + timedelta(days=1), tz)
