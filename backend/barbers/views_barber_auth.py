import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.throttles import AuthIPThrottle
from barbers.barber_auth import encode_barber_tokens
from barbers.models import Barber, BarberProfile, BarberService, BarberWorkingHours as IndepWorkingHours
from barbers.permissions import IsBarber


class BarberTokenView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        if email:
            has_user = User.objects.filter(email__iexact=email).exists()
            has_barber = Barber.objects.filter(email__iexact=email).exists()
            if has_user and not has_barber:
                return Response(
                    {
                        "detail": "Bu email mijoz akkauntiga tegishli. Sartarosh panelidan kirish mumkin emas — mijoz ilovasidan kiring.",
                    },
                    status=401,
                )
        b = Barber.objects.filter(email__iexact=email, is_active=True).first()
        if not b or not b.check_password(password):
            return Response({"detail": "Noto‘g‘ri email yoki parol."}, status=401)
        access, refresh = encode_barber_tokens(b.id)
        Barber.objects.filter(pk=b.pk).update(last_login=timezone.now())
        return Response({"access": access, "refresh": refresh})


class BarberTokenRefreshView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthIPThrottle]

    def post(self, request):
        raw = request.data.get("refresh") or ""
        if not raw:
            return Response({"detail": "Refresh token required."}, status=400)
        try:
            payload = jwt.decode(
                raw, settings.JWT_HS256_SIGNING_KEY, algorithms=["HS256"]
            )
        except jwt.PyJWTError:
            return Response({"detail": "Token invalid."}, status=401)
        if payload.get("type") != "barber_refresh":
            return Response({"detail": "Wrong token type."}, status=401)
        bid = payload.get("barber_id")
        b = Barber.objects.filter(pk=bid, is_active=True).first()
        if not b:
            return Response({"detail": "Barber not found."}, status=401)
        access, refresh = encode_barber_tokens(b.id)
        return Response({"access": access, "refresh": refresh})


class BarberMeView(APIView):
    permission_classes = [IsBarber]

    def get(self, request):
        b = request.user.barber
        return Response(
            {
                "id": b.id,
                "email": b.email,
                "full_name": b.full_name,
                "phone": b.phone,
                "role": "BARBER",
                "work_mode": b.work_mode,
                "onboarding_completed": bool(b.onboarding_completed_at),
            }
        )

    def patch(self, request):
        """
        Barber panel: allow updating basic profile fields.
        Supports both JSON and multipart (avatar upload).
        """
        b = request.user.barber
        full_name = request.data.get("full_name")
        phone = request.data.get("phone")
        if full_name is not None:
            b.full_name = str(full_name).strip()
        if phone is not None:
            b.phone = str(phone).strip()
        avatar = request.FILES.get("avatar")
        if avatar is not None:
            b.avatar = avatar
        try:
            b.save()
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
        return Response(
            {
                "id": b.id,
                "email": b.email,
                "full_name": b.full_name,
                "phone": b.phone,
                "role": "BARBER",
                "work_mode": b.work_mode,
                "onboarding_completed": bool(b.onboarding_completed_at),
            }
        )


class BarberOnboardingStatusView(APIView):
    """
    Barber panel uchun onboarding gate: qaysi sahifaga majburan yo'naltirish kerakligini
    backend hisoblaydi (source of truth).
    """

    permission_classes = [IsBarber]

    def get(self, request):
        from django.utils import timezone

        from salons.models import BarberWorkingHours as SalonWorkingHours
        from salons.models import Salon, SalonMembership

        b: Barber = request.user.barber
        flow = (b.onboarding_flow or "").strip()
        wm = b.work_mode

        prof = BarberProfile.objects.filter(barber=b).first()
        has_location = bool(prof and prof.latitude is not None and prof.longitude is not None)

        def complete(payload: dict) -> Response:
            if not b.onboarding_completed_at:
                Barber.objects.filter(pk=b.pk).update(onboarding_completed_at=timezone.now())
            payload["is_complete"] = True
            return Response(payload)

        def incomplete(next_path: str, payload: dict) -> Response:
            payload["is_complete"] = False
            payload["required_next_path"] = next_path
            return Response(payload)

        payload = {
            "flow": flow or None,
            "work_mode": wm,
            "has_location": has_location,
        }

        # Independent flow
        if flow == Barber.OnboardingFlow.INDEPENDENT or wm == Barber.WorkMode.INDEPENDENT:
            has_services = BarberService.objects.filter(profile__barber=b, is_active=True).exists()
            has_hours = IndepWorkingHours.objects.filter(profile__barber=b).exists()
            payload.update({"has_services": has_services, "has_working_hours": has_hours})
            if not has_location or not has_services or not has_hours:
                return incomplete("/independent/setup", payload)
            return complete(payload)

        # Salon flows: owner / employee / mybarber
        # Owner salon exists?
        owns_salon = Salon.objects.filter(owner_barber=b).exists()
        active_mem = SalonMembership.objects.filter(
            barber=b, invite_state=SalonMembership.InviteState.ACTIVE
        ).select_related("salon").first()
        owner_mem = (
            SalonMembership.objects.filter(barber=b, salon__owner_barber=b)
            .select_related("salon")
            .first()
        )

        payload.update(
            {
                "owns_salon": owns_salon,
                "active_membership_id": active_mem.id if active_mem else None,
                "owner_membership_id": owner_mem.id if owner_mem else None,
                "salon_id": (active_mem.salon_id if active_mem else (owner_mem.salon_id if owner_mem else None)),
            }
        )

        if flow in (Barber.OnboardingFlow.OWNER, Barber.OnboardingFlow.MYBARBER) or (flow == "" and owns_salon):
            if not owns_salon:
                nxt = "/salon/create?preset=mybarber" if flow == Barber.OnboardingFlow.MYBARBER else "/salon/create"
                return incomplete(nxt, payload)
            mem = owner_mem
            has_mem_hours = bool(mem and SalonWorkingHours.objects.filter(membership=mem).exists())
            payload["has_membership_hours"] = has_mem_hours
            if not has_location or not has_mem_hours:
                return incomplete("/salon/create", payload)
            return complete(payload)

        # Employee flow
        if flow == Barber.OnboardingFlow.EMPLOYEE or flow == "":
            if not active_mem:
                return incomplete("/salon/join", payload)
            has_mem_hours = SalonWorkingHours.objects.filter(membership=active_mem).exists()
            payload["has_membership_hours"] = has_mem_hours
            if not has_location or not has_mem_hours:
                return incomplete("/salon/join", payload)
            return complete(payload)

        # Unknown: force auth
        return incomplete("/auth", payload)
