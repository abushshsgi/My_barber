from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ReferralAttribution
from accounts.referral import build_invite_url, ensure_referral_code
from accounts.throttles import ReferralThrottle


class MyReferralView(APIView):
    """GET — foydalanuvchi referal kodi, taklif havolasi va statistikasi."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ReferralThrottle]

    def get(self, request):
        code = ensure_referral_code(request.user)
        invite_count = ReferralAttribution.objects.filter(referrer=request.user).count()
        from subscriptions.plans import (
            REFERRAL_TRIAL_DAYS,
            REFERRAL_TRIAL_PLAN,
            REFERRAL_TRIAL_REQUIRED,
        )
        from subscriptions.models import ReferralTrialGrant

        trial = ReferralTrialGrant.objects.filter(user=request.user).first()
        return Response(
            {
                "code": code,
                "invite_url": build_invite_url(code),
                "invite_count": invite_count,
                "trial": {
                    "required": REFERRAL_TRIAL_REQUIRED,
                    "days": REFERRAL_TRIAL_DAYS,
                    "plan": REFERRAL_TRIAL_PLAN,
                    "progress": min(invite_count, REFERRAL_TRIAL_REQUIRED),
                    "eligible": invite_count >= REFERRAL_TRIAL_REQUIRED,
                    "granted": bool(trial),
                    "ends_at": trial.ends_at.isoformat() if trial else None,
                },
            }
        )
