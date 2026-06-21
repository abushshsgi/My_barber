"""Salon reyting xulosasi — distribution, guest favorite, highlights."""

from __future__ import annotations

from collections import defaultdict

from django.db.models import Avg, Count

from bookings.models import Review

GUEST_FAVORITE_MIN_RATING = 4.8
GUEST_FAVORITE_MIN_REVIEWS = 10

HIGHLIGHT_META = [
    ("cleanliness", {"uz": "Tozalik", "ru": "Чистота", "en": "Cleanliness"}),
    ("service", {"uz": "Xizmat", "ru": "Сервис", "en": "Service"}),
    ("masters", {"uz": "Ustalar", "ru": "Мастера", "en": "Masters"}),
    ("atmosphere", {"uz": "Atmosfera", "ru": "Атмосфера", "en": "Atmosphere"}),
]


def _lang(request) -> str:
    if request is None:
        return "uz"
    raw = (request.query_params.get("lang") or request.headers.get("Accept-Language") or "uz").split(",")[0]
    code = raw.strip().lower().split("-")[0]
    return code if code in ("uz", "ru", "en") else "uz"


def build_rating_summary(salon, request=None) -> dict:
    lang = _lang(request)
    qs = Review.objects.filter(salon=salon)
    agg = qs.aggregate(avg=Avg("rating"), total=Count("id"))
    rating_avg = round(float(agg["avg"] or 0), 2)
    review_count = int(agg["total"] or 0)

    distribution = {str(i): 0 for i in range(1, 6)}
    for row in qs.values("rating").annotate(c=Count("id")):
        r = str(row["rating"])
        if r in distribution:
            distribution[r] = row["c"]

    is_guest_favorite = rating_avg >= GUEST_FAVORITE_MIN_RATING and review_count >= GUEST_FAVORITE_MIN_REVIEWS

    service_scores: dict[str, list[int]] = defaultdict(list)
    for rev in qs.select_related("booking").prefetch_related("booking__lines"):
        for line in rev.booking.lines.all():
            name = (line.service_name or "").strip()
            if name:
                service_scores[name].append(rev.rating)

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

    highlights = []
    if service_highlights:
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
