from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ReferralAttribution
from accounts.referral import build_invite_url, ensure_referral_code
from accounts.throttles import ReferralThrottle


def _mask_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 4:
        return "***"
    if digits.startswith("998") and len(digits) >= 9:
        return f"+998•••{digits[-4:]}"
    return f"•••{digits[-4:]}"


def _invitee_payload(attr: ReferralAttribution, request) -> dict:
    referee = attr.referee
    name = (referee.full_name or "").strip()
    if not name:
        name = (referee.first_name or "").strip() or "Foydalanuvchi"
    avatar = None
    if getattr(referee, "avatar", None):
        try:
            url = referee.avatar.url
            avatar = request.build_absolute_uri(url) if request else url
        except Exception:
            avatar = None

    badge = None
    try:
        from subscriptions.plans import get_plan
        from subscriptions.services import get_active_subscription

        sub = get_active_subscription(referee)
        if sub:
            ents = sub.entitlements or {}
            badge = ents.get("badge")
            if not badge:
                plan = get_plan(sub.plan_code)
                badge = plan.get("badge") if plan else None
    except Exception:
        badge = None

    return {
        "id": referee.pk,
        "full_name": name,
        "phone_masked": _mask_phone(referee.phone),
        "avatar_url": avatar,
        "joined_at": attr.created_at.isoformat() if attr.created_at else None,
        "badge": badge,
    }


def _trial_payload(*, user, invite_count: int) -> dict:
    from subscriptions.plans import (
        REFERRAL_TRIAL_DAYS,
        REFERRAL_TRIAL_PLAN,
        REFERRAL_TRIAL_REQUIRED,
    )
    from subscriptions.models import ReferralTrialGrant

    trial = ReferralTrialGrant.objects.filter(user=user).first()
    return {
        "required": REFERRAL_TRIAL_REQUIRED,
        "days": REFERRAL_TRIAL_DAYS,
        "plan": REFERRAL_TRIAL_PLAN,
        "progress": min(invite_count, REFERRAL_TRIAL_REQUIRED),
        "eligible": invite_count >= REFERRAL_TRIAL_REQUIRED,
        "granted": bool(trial),
        "ends_at": trial.ends_at.isoformat() if trial else None,
    }


def _referral_response(request) -> dict:
    code = ensure_referral_code(request.user)
    attributions = (
        ReferralAttribution.objects.filter(referrer=request.user)
        .select_related("referee")
        .order_by("-created_at", "-id")
    )
    invite_count = attributions.count()
    invites = [_invitee_payload(a, request) for a in attributions[:50]]
    return {
        "code": code,
        "invite_url": build_invite_url(code),
        "invite_count": invite_count,
        "invites": invites,
        "trial": _trial_payload(user=request.user, invite_count=invite_count),
    }


class MyReferralView(APIView):
    """GET — referal kod, takliflar va sinov holati. POST — Starter sinovni olish."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ReferralThrottle]

    def get(self, request):
        return Response(_referral_response(request))

    def post(self, request):
        """Eligible bo'lsa Starter trialni beradi (bir marta)."""
        from subscriptions.plans import REFERRAL_TRIAL_REQUIRED
        from subscriptions.models import ReferralTrialGrant
        from subscriptions.services import maybe_grant_referral_trial

        invite_count = ReferralAttribution.objects.filter(referrer=request.user).count()
        already = ReferralTrialGrant.objects.filter(user=request.user).first()
        if already:
            body = _referral_response(request)
            body["claimed"] = False
            body["already_granted"] = True
            return Response(body)

        if invite_count < REFERRAL_TRIAL_REQUIRED:
            return Response(
                {
                    "detail": (
                        f"Bonus olish uchun yana "
                        f"{REFERRAL_TRIAL_REQUIRED - invite_count} ta do'st kerak."
                    ),
                    "invite_count": invite_count,
                    "required": REFERRAL_TRIAL_REQUIRED,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        maybe_grant_referral_trial(request.user)
        body = _referral_response(request)
        body["claimed"] = bool(body["trial"]["granted"])
        body["already_granted"] = False
        if not body["claimed"]:
            return Response(
                {
                    "detail": "Sinovni berib bo'lmadi. Keyinroq qayta urinib ko'ring.",
                    **body,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(body)
