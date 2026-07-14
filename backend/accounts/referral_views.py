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
        return Response(
            {
                "code": code,
                "invite_url": build_invite_url(code),
                "invite_count": invite_count,
            }
        )
