from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.google_auth import (
    GoogleAuthError,
    get_or_create_user_from_google,
    is_google_auth_configured,
    verify_google_id_token,
)
from accounts.throttles import AuthIPThrottle
from accounts.views_phone_auth import _auth_success_body


class GoogleLoginView(APIView):
    """POST { id_token } — Google ID token bilan kirish yoki ro'yxatdan o'tish."""

    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        if not is_google_auth_configured():
            return Response({"detail": "Google kirish sozlanmagan."}, status=503)

        id_token = request.data.get("id_token") or request.data.get("credential")
        try:
            profile = verify_google_id_token(id_token)
            user, is_new = get_or_create_user_from_google(profile)
        except GoogleAuthError as exc:
            return Response({"detail": exc.message}, status=exc.status)

        if not user.is_active:
            return Response({"detail": "Akkaunt faol emas."}, status=403)

        from accounts.models import User
        from wallet.services.wallet_service import WalletService

        if is_new:
            from barbers.customer_invite import apply_signup_invites

            apply_signup_invites(
                new_user=user,
                referral_code=request.data.get("referral_code"),
                barber_invite_code=request.data.get("barber_invite_code"),
            )

        User.objects.filter(pk=user.pk).update(last_login=timezone.now())
        WalletService.ensure_wallet(user)
        return Response(_auth_success_body(user, is_new=is_new, request=request))
