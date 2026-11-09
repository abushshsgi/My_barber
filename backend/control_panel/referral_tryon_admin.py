"""Admin: do'st taklifi — nechta try berilgan va ishlatilganmi."""

from __future__ import annotations

from django.db.models import Count, Q
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.email_utils import is_internal_email
from accounts.models import ReferralAttribution, User
from accounts.permissions import IsAdmin


def _display_name(full_name: str, first_name: str, phone: str) -> str:
    name = (full_name or "").strip()
    if name:
        return name
    first = (first_name or "").strip()
    if first:
        return first
    if phone:
        return phone
    return "Foydalanuvchi"


def _public_email(email: str | None) -> str | None:
    if is_internal_email(email):
        return None
    return email or None


def _usage(granted: int, left: int) -> tuple[int, str]:
    used = max(0, granted - left)
    if granted > 0 and used > 0:
        return used, "used"
    if granted > 0:
        return 0, "unused"
    return 0, "none"


def _friend_row(attr: ReferralAttribution) -> dict:
    friend = attr.referee
    return {
        "id": friend.pk,
        "full_name": _display_name(friend.full_name, friend.first_name, friend.phone or ""),
        "phone": friend.phone or "",
        "email": _public_email(friend.email),
        "joined_at": attr.created_at.isoformat() if attr.created_at else None,
        "try_granted": bool(attr.credit_granted),
    }


def _annotated_users():
    return User.objects.annotate(
        friends_count=Count("referrals_made", distinct=True),
        tries_granted=Count(
            "referrals_made",
            filter=Q(referrals_made__credit_granted=True),
            distinct=True,
        ),
    ).filter(friends_count__gt=0)


def _collect(qs) -> list[dict]:
    rows = []
    for row in qs.values(
        "id",
        "full_name",
        "first_name",
        "phone",
        "email",
        "morph_referral_credits",
        "friends_count",
        "tries_granted",
    ):
        granted = int(row["tries_granted"] or 0)
        left = int(row["morph_referral_credits"] or 0)
        used_count, usage = _usage(granted, left)
        rows.append(
            {
                "user_id": row["id"],
                "full_name": _display_name(row["full_name"], row["first_name"], row["phone"] or ""),
                "phone": row["phone"] or "",
                "email": _public_email(row["email"]),
                "search_email": (row["email"] or "").lower(),
                "friends_count": int(row["friends_count"] or 0),
                "tries_granted": granted,
                "tries_used": used_count,
                "tries_left": left,
                "usage": usage,
            }
        )
    rows.sort(key=lambda item: (-item["friends_count"], -item["tries_used"], -item["user_id"]))
    return rows


def _summary(rows: list[dict]) -> dict:
    return {
        "referrers": len(rows),
        "friends": sum(row["friends_count"] for row in rows),
        "tries_granted": sum(row["tries_granted"] for row in rows),
        "tries_used": sum(row["tries_used"] for row in rows),
        "tries_left": sum(row["tries_left"] for row in rows),
        "referrers_used": sum(1 for row in rows if row["usage"] == "used"),
        "referrers_unused": sum(1 for row in rows if row["usage"] == "unused"),
        "referrers_without_try": sum(1 for row in rows if row["usage"] == "none"),
    }


class AdminReferralTryonView(APIView):
    """GET — kim nechta do'st chaqirgan, nechta try olgan, foydalanganmi."""

    permission_classes = [IsAdmin]

    def get(self, request):
        rows = _collect(_annotated_users())
        summary = _summary(rows)

        q = (request.query_params.get("q") or "").strip().lower()
        if q:
            rows = [
                row
                for row in rows
                if q in row["full_name"].lower()
                or q in row["phone"].lower()
                or q in (row["email"] or "").lower()
                or q in row["search_email"]
            ]

        used = (request.query_params.get("used") or "all").strip().lower()
        if used == "yes":
            rows = [row for row in rows if row["usage"] == "used"]
        elif used == "no":
            rows = [row for row in rows if row["usage"] == "unused"]
        elif used == "none":
            rows = [row for row in rows if row["usage"] == "none"]

        try:
            page = max(1, int(request.query_params.get("page") or 1))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(request.query_params.get("page_size") or 30)
        except (TypeError, ValueError):
            page_size = 30
        page_size = min(100, max(1, page_size))

        count = len(rows)
        page_rows = rows[(page - 1) * page_size : page * page_size]
        ids = [row["user_id"] for row in page_rows]
        friends_by_user: dict[int, list] = {user_id: [] for user_id in ids}
        if ids:
            attributions = (
                ReferralAttribution.objects.filter(referrer_id__in=ids)
                .select_related("referee")
                .order_by("-created_at", "-id")
            )
            for attr in attributions:
                bucket = friends_by_user.setdefault(attr.referrer_id, [])
                if len(bucket) < 40:
                    bucket.append(_friend_row(attr))

        results = []
        for row in page_rows:
            results.append(
                {
                    "user_id": row["user_id"],
                    "full_name": row["full_name"],
                    "phone": row["phone"],
                    "email": row["email"],
                    "friends_count": row["friends_count"],
                    "tries_granted": row["tries_granted"],
                    "tries_used": row["tries_used"],
                    "tries_left": row["tries_left"],
                    "usage": row["usage"],
                    "friends": friends_by_user.get(row["user_id"], []),
                }
            )

        return Response(
            {
                "summary": summary,
                "count": count,
                "page": page,
                "page_size": page_size,
                "results": results,
            }
        )
