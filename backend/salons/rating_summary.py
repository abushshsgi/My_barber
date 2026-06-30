"""Salon reyting xulosasi — distribution, guest favorite, highlights."""

from __future__ import annotations

from collections import defaultdict

from django.db.models import Avg, Count, FloatField, Value
from django.db.models.functions import Cast, Coalesce

from bookings.db_compat import (
    reviews_has_dimension_table,
    reviews_has_salon_rating_column,
)
from bookings.models import Review

GUEST_FAVORITE_MIN_RATING = 4.8
GUEST_FAVORITE_MIN_REVIEWS = 10


def _salon_score():
    """Salon umumiy bahosi: `salon_rating` ustuni bo'lsa Coalesce, bo'lmasa `rating`."""
    if reviews_has_salon_rating_column():
        return Coalesce("salon_rating", "rating")
    return "rating"

HIGHLIGHT_META = [
    ("cleanliness", {"uz": "Tozalik", "ru": "Чистота", "en": "Cleanliness"}),
    ("service", {"uz": "Xizmat", "ru": "Сервис", "en": "Service"}),
    ("masters", {"uz": "Ustalar", "ru": "Мастера", "en": "Masters"}),
    ("atmosphere", {"uz": "Atmosfera", "ru": "Атмосфера", "en": "Atmosphere"}),
]

# So'rovnoma o'lchovlari uchun ko'p tilli yorliqlar.
SALON_DIMENSION_LABELS = {
    "atmosphere": {"uz": "Atmosfera", "ru": "Атмосфера", "en": "Atmosphere"},
    "cleanliness": {"uz": "Tozalik va hid", "ru": "Чистота", "en": "Cleanliness"},
    "comfort": {"uz": "Qulaylik", "ru": "Комфорт", "en": "Comfort"},
}


def _lang(request) -> str:
    if request is None:
        return "uz"
    raw = (request.query_params.get("lang") or request.headers.get("Accept-Language") or "uz").split(",")[0]
    code = raw.strip().lower().split("-")[0]
    return code if code in ("uz", "ru", "en") else "uz"


def build_rating_summary(salon, request=None) -> dict:
    lang = _lang(request)
    score_expr = _salon_score()
    qs = Review.objects.filter(salon=salon)
    # PostgreSQL: Avg(Coalesce(int, int)) integer qaytaradi — Cast bilan float ga o'tkazamiz.
    agg = qs.aggregate(
        avg=Coalesce(
            Cast(Avg(score_expr), FloatField()),
            Value(0.0),
            output_field=FloatField(),
        ),
        total=Count("id"),
    )
    rating_avg = round(float(agg["avg"] or 0), 2)
    review_count = int(agg["total"] or 0)

    distribution = {str(i): 0 for i in range(1, 6)}
    for row in qs.annotate(score=score_expr).values("score").annotate(c=Count("id")):
        raw = row["score"]
        if raw is None:
            continue
        r = str(int(round(float(raw))))
        if r in distribution:
            distribution[r] = row["c"]

    is_guest_favorite = rating_avg >= GUEST_FAVORITE_MIN_RATING and review_count >= GUEST_FAVORITE_MIN_REVIEWS

    service_scores: dict[str, list[int]] = defaultdict(list)
    ratings_by_booking = {
        bid: rating for bid, rating in qs.values_list("booking_id", "rating") if bid
    }
    if ratings_by_booking:
        from bookings.models import BookingLine

        for line in BookingLine.objects.filter(booking_id__in=ratings_by_booking).values(
            "booking_id", "service_name"
        ):
            rating = ratings_by_booking.get(line["booking_id"])
            name = (line["service_name"] or "").strip()
            if rating and name:
                service_scores[name].append(rating)

    service_highlights = []
    for name, ratings in service_scores.items():
        if not ratings:
            continue
        service_highlights.append(
            {
                "code": f"service:{name[:48]}",
                "label": name,
                "score": round(sum(ratings) / len(ratings), 1),
                "count": len(ratings),
            }
        )
    service_highlights.sort(key=lambda x: (-x["count"], -x["score"]))
    service_highlights = service_highlights[:4]

    # So'rovnoma o'lchovlari (haqiqiy ma'lumot) — ustuvor.
    dimension_highlights = []
    if reviews_has_dimension_table():
        from bookings.models import ReviewDimensionScore

        dim_rows = (
            ReviewDimensionScore.objects.filter(
                review__salon=salon,
                target=ReviewDimensionScore.Target.SALON,
            )
            .values("dimension")
            .annotate(avg=Avg("score"), c=Count("id"))
        )
        for row in dim_rows:
            slug = row["dimension"]
            labels = SALON_DIMENSION_LABELS.get(slug)
            dimension_highlights.append(
                {
                    "code": slug,
                    "label": (labels.get(lang) or labels.get("uz")) if labels else slug,
                    "score": round(float(row["avg"] or 0), 1),
                    "count": int(row["c"] or 0),
                }
            )
        dimension_highlights.sort(key=lambda x: (-x["count"], -x["score"]))

    highlights = []
    if dimension_highlights:
        highlights = dimension_highlights
    elif service_highlights:
        highlights = service_highlights
    else:
        offsets = [0.05, 0.0, -0.02, 0.03]
        for i, (code, labels) in enumerate(HIGHLIGHT_META):
            if review_count == 0:
                score = 0.0
            else:
                score = min(5.0, round(rating_avg + offsets[i % len(offsets)], 1))
            highlights.append(
                {
                    "code": code,
                    "label": labels.get(lang) or labels.get("uz") or code,
                    "score": score,
                    "count": max(1, review_count // 4) if review_count else 0,
                }
            )

    return {
        "rating_avg": rating_avg,
        "review_count": review_count,
        "is_guest_favorite": is_guest_favorite,
        "distribution": distribution,
        "highlights": highlights,
    }
