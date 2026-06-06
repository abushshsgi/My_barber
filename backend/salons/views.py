from django.core.files.base import File
from django.db import transaction
from django.db.models import Avg, Count, FloatField, Q, Value
from django.db.models.functions import Cast, Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from barbers.activation_permissions import IsAuthenticatedBarberAware
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import customer_catalog_region, is_platform_admin, request_barber
from accounts.uz_regions import UzRegion
from accounts.throttles import SalonJoinThrottle, SalonSearchThrottle
from barbers.models import Barber, BarberProfile
from barbers.readiness import barber_is_publicly_visible
from notifications.utils import notify_barber, notify_user

from .geo_join import (
    JOIN_MAX_DISTANCE_KM,
    LOCATION_MISMATCH_MSG,
    assert_join_distance_ok,
    haversine_km,
)
from .join_service import attach_worker_membership
from .models import CatalogService, BarberWorkingHours, FavoriteSalon, Salon, SalonImage, SalonMembership
from .serializers import (
    BarberWorkingHoursSerializer,
    BarberSalonViewSerializer,
    SalonCreateUpdateSerializer,
    SalonDetailSerializer,
    SalonListSerializer,
    SalonMembershipSerializer,
)


class SalonViewSet(viewsets.ModelViewSet):
    lookup_field = "pk"

    def get_permissions(self):
        return [IsAuthenticatedBarberAware()]

    def _salon_public_list_qs(self):
        """Ro‘yxat va nearby uchun: reyting/sharhlar soni bitta so‘rovda."""
        # PostgreSQL: Coalesce(Avg(..), Value(0)) integer/numeric aralashmasi 500 beradi — FloatField bilan bir xil.
        return (
            Salon.objects.filter(is_published=True)
            .select_related("owner", "owner_barber")
            .annotate(
                review_count=Count("reviews", distinct=True),
                rating_avg=Coalesce(
                    Cast(Avg("reviews__rating"), FloatField()),
                    Value(0.0),
                    output_field=FloatField(),
                ),
            )
            .order_by("-created_at", "-id")
        )

    def _apply_public_salon_region(self, qs):
        """Mijoz JWT: viloyat serverdan; anonim / barber: ixtiyoriy ?region=."""
        forced = customer_catalog_region(self.request)
        if forced:
            return qs.filter(owner_barber__region=forced)
        region = (self.request.query_params.get("region") or "").strip()
        valid_regions = {c[0] for c in UzRegion.choices}
        if region and region in valid_regions:
            return qs.filter(owner_barber__region=region)
        return qs

    def get_queryset(self):
        qs = Salon.objects.select_related("owner", "owner_barber")
        if self.action == "retrieve":
            qs = qs.prefetch_related("images", "hours", "services", "services__catalog_service")

        if self.action == "list":
            qs = self._apply_public_salon_region(self._salon_public_list_qs())
            ids_param = (self.request.query_params.get("ids") or "").strip()
            if ids_param:
                id_list = []
                for part in ids_param.split(","):
                    part = part.strip()
                    if part.isdigit():
                        id_list.append(int(part))
                if id_list:
                    qs = qs.filter(pk__in=id_list)
            return qs

        if self.action == "nearby":
            return self._apply_public_salon_region(self._salon_public_list_qs())

        if self.action == "retrieve":
            bp = request_barber(self.request)
            if bp is not None:
                return qs.filter(
                    Q(is_published=True)
                    | Q(owner_barber=bp)
                    | Q(
                        memberships__barber=bp,
                        memberships__invite_state=SalonMembership.InviteState.ACTIVE,
                    )
                ).distinct()
            qs = qs.filter(is_published=True)
            reg = customer_catalog_region(self.request)
            if reg:
                qs = qs.filter(owner_barber__region=reg)
            return qs

        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return SalonListSerializer
        if self.action in ("create", "update", "partial_update"):
            return SalonCreateUpdateSerializer
        return SalonDetailSerializer

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied

        bp = request_barber(self.request)
        if bp is None:
            raise PermissionDenied("Faqat sartarosh akkaunti bilan salon yaratish mumkin.")
        salon = serializer.save(owner_barber=bp)
        SalonMembership.objects.get_or_create(
            barber=bp,
            salon=salon,
            defaults={
                "role": SalonMembership.Role.OWNER,
                "invite_state": SalonMembership.InviteState.NA,
            },
        )

    def perform_update(self, serializer):
        salon = self.get_object()
        bp = request_barber(self.request)
        allowed = is_platform_admin(self.request) or (
            bp is not None and salon.owner_barber_id == bp.id
        )
        if not allowed:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        serializer.save()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticatedBarberAware])
    def mine(self, request):
        """Salon egasi yoki faol a’zo bo‘lgan sartaroshlar."""
        bp = request_barber(request)
        if bp is None:
            return Response([])
        qs = (
            Salon.objects.filter(
                Q(owner_barber=bp)
                | Q(
                    memberships__barber=bp,
                    memberships__invite_state=SalonMembership.InviteState.ACTIVE,
                )
            )
            .select_related("owner")
            .annotate(
                review_count=Count("reviews", distinct=True),
                rating_avg=Coalesce(
                    Cast(Avg("reviews__rating"), FloatField()),
                    Value(0.0),
                    output_field=FloatField(),
                ),
            )
            .distinct()
            .order_by("-created_at", "-id")
        )
        return Response(
            SalonListSerializer(qs, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticatedBarberAware])
    def barber_view(self, request, pk=None):
        """
        Barber panel uchun read-only salon ko‘rinishi (services yo‘q).
        Ruxsat: owner yoki ACTIVE membership.
        """
        bp = request_barber(request)
        if bp is None:
            return Response(status=403)
        salon = get_object_or_404(
            Salon.objects.select_related("owner", "owner_barber").prefetch_related("images", "hours"),
            pk=pk,
        )
        allowed = (
            salon.owner_barber_id == bp.id
            or SalonMembership.objects.filter(
                salon=salon,
                barber=bp,
                invite_state=SalonMembership.InviteState.ACTIVE,
            ).exists()
        )
        if not allowed and not is_platform_admin(request):
            return Response(status=403)
        return Response(BarberSalonViewSerializer(salon, context={"request": request}).data)

    @action(
        detail=False,
        methods=["get"],
        throttle_classes=[SalonSearchThrottle],
    )
    def search(self, request):
        """Salon nomi bo‘yicha qidiruv (mijoz discover + barber salonga qo‘shilish)."""
        q = request.query_params.get("q", "").strip()
        if len(q) < 1:
            return Response([])
        qs = self._salon_public_list_qs().filter(name__icontains=q)
        bp = request_barber(request)
        if bp is not None:
            br = (bp.region or "").strip()
            if br:
                qs = qs.filter(owner_barber__region=br)
        else:
            qs = self._apply_public_salon_region(qs)
        qs = qs.order_by("name")[:30]
        out = []
        for s in qs:
            row = SalonListSerializer(s, context={"request": request}).data
            row["latitude"] = float(s.latitude)
            row["longitude"] = float(s.longitude)
            out.append(row)
        return Response(out)

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticatedBarberAware],
        throttle_classes=[SalonJoinThrottle],
    )
    def join(self, request):
        """
        Salonni tanlagandan keyin: barber joylashuvi salon bilan 100 m ichida bo‘lsa ACTIVE membership.
        Boshqa faol membershiplar bekor qilinadi (salon almashtirish).
        """
        from rest_framework.exceptions import PermissionDenied, ValidationError

        try:
            salon_id = int(request.data.get("salon_id"))
            lat = float(request.data["latitude"])
            lng = float(request.data["longitude"])
        except (KeyError, TypeError, ValueError):
            raise ValidationError(
                {"detail": "salon_id, latitude va longitude majburiy."}
            )

        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
            raise ValidationError({"detail": "latitude / longitude noto'g'ri."})

        salon = get_object_or_404(Salon, pk=salon_id)
        try:
            assert_join_distance_ok(salon, lat, lng)
        except ValidationError as exc:
            return Response(exc.detail, status=400)

        bp = request_barber(request)
        if bp is None:
            raise PermissionDenied("Faqat sartarosh akkaunti bilan qo‘shilish mumkin.")

        mem = attach_worker_membership(bp, salon, lat, lng)

        return Response(
            {
                "detail": "joined",
                "membership_id": mem.id,
                "salon_id": salon.id,
            }
        )

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def nearby(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radius = float(request.query_params.get("radius_km", 1))
        except (KeyError, ValueError, TypeError):
            return Response(
                {"detail": "lat, lng required; radius_km optional."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        salons = self._apply_public_salon_region(self._salon_public_list_qs())
        result = []
        for s in salons:
            d = haversine_km(lat, lng, float(s.latitude), float(s.longitude))
            if d <= radius:
                result.append({"salon": SalonListSerializer(s, context={"request": request}).data, "distance_km": round(d, 3)})
        result.sort(key=lambda x: x["distance_km"])
        return Response(result)

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def staff(self, request, pk=None):
        salon = self.get_object()
        mems = SalonMembership.objects.filter(
            salon=salon,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).select_related("barber")
        out = []
        for m in mems:
            b = m.barber
            if not barber_is_publicly_visible(b):
                continue
            avatar = None
            if b.avatar:
                avatar = request.build_absolute_uri(b.avatar.url)
            out.append(
                {
                    "id": b.id,
                    "full_name": b.full_name or b.email,
                    "avatar": avatar,
                    "role": m.role,
                    "experience_years": m.experience_years,
                }
            )
        return Response(out)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def add_images(self, request, pk=None):
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        images = request.FILES.getlist("images")
        order = salon.images.count()
        for img in images:
            SalonImage.objects.create(salon=salon, image=img, sort_order=order)
            order += 1
        return Response({"status": "ok"})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def upload_cover(self, request, pk=None):
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        f = request.FILES.get("cover")
        if not f:
            return Response({"detail": "cover fayl majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        salon.cover_image.save(f.name, f, save=True)
        return Response(
            SalonDetailSerializer(salon, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def set_cover_from_gallery(self, request, pk=None):
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        try:
            si_id = int(request.data["salon_image_id"])
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "salon_image_id majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        si = get_object_or_404(SalonImage, pk=si_id, salon=salon)
        with si.image.open("rb") as src:
            name = si.image.name.split("/")[-1] or "cover.jpg"
            salon.cover_image.save(name, File(src), save=True)
        return Response(
            SalonDetailSerializer(salon, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def reorder_images(self, request, pk=None):
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get("image_ids")
        if not isinstance(ids, list) or len(ids) == 0:
            return Response(
                {"detail": "image_ids bo‘sh bo‘lmagan ro‘yxat bo‘lishi kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            id_list = [int(x) for x in ids]
        except (TypeError, ValueError):
            return Response(
                {"detail": "image_ids faqat butun sonlar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        existing = set(salon.images.values_list("id", flat=True))
        if len(id_list) != len(existing) or set(id_list) != existing:
            return Response(
                {
                    "detail": "Barcha galereya rasmlari IDlari aynan bir marta sanalishi kerak.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            for idx, img_id in enumerate(id_list):
                SalonImage.objects.filter(pk=img_id, salon=salon).update(
                    sort_order=idx
                )
        return Response({"status": "ok"})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def remove_image(self, request, pk=None):
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        try:
            image_id = int(request.data["image_id"])
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "image_id majburiy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted = SalonImage.objects.filter(pk=image_id, salon=salon).delete()[0]
        if not deleted:
            return Response({"detail": "Rasm topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        for idx, img in enumerate(salon.images.order_by("sort_order", "id")):
            SalonImage.objects.filter(pk=img.pk).update(sort_order=idx)
        return Response({"status": "ok"})

class FavoriteSalonListCreateView(APIView):
    permission_classes = [IsAuthenticatedBarberAware]

    def get(self, request):
        rows = FavoriteSalon.objects.filter(user=request.user).select_related("salon")
        return Response(
            {
                "count": rows.count(),
                "results": [
                    {"id": row.id, "salon": row.salon_id, "created_at": row.created_at.isoformat()}
                    for row in rows
                ],
            }
        )

    def post(self, request):
        salon_id = request.data.get("salon")
        salon = get_object_or_404(Salon, pk=salon_id, is_published=True)
        row, _ = FavoriteSalon.objects.get_or_create(user=request.user, salon=salon)
        return Response(
            {"id": row.id, "salon": salon.id, "created_at": row.created_at.isoformat()},
            status=status.HTTP_201_CREATED,
        )


class FavoriteSalonDetailView(APIView):
    permission_classes = [IsAuthenticatedBarberAware]

    def delete(self, request, salon_id):
        FavoriteSalon.objects.filter(user=request.user, salon_id=salon_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SalonMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = SalonMembershipSerializer
    permission_classes = [IsAuthenticatedBarberAware]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        bp = request_barber(self.request)
        if bp is None:
            return SalonMembership.objects.none()
        qs = SalonMembership.objects.filter(
            Q(barber=bp)
            | Q(salon__owner_barber=bp)
        ).select_related("barber", "salon")
        salon_param = self.request.query_params.get("salon")
        if salon_param:
            try:
                sid = int(salon_param)
            except (TypeError, ValueError):
                return qs
            if Salon.objects.filter(pk=sid, owner_barber=bp).exists():
                qs = qs.filter(salon_id=sid)
            else:
                qs = qs.filter(salon_id=sid, barber=bp)
        return qs

    @action(detail=False, methods=["post"])
    def invite(self, request):
        """Salon egasi boshqa sartaroshni (barber id) ishchiga taklif qiladi."""
        salon_id = request.data.get("salon")
        barber_id = request.data.get("barber_id")
        bp = request_barber(request)
        if bp is None:
            return Response({"detail": "Faqat sartarosh."}, status=403)
        salon = get_object_or_404(Salon, pk=salon_id, owner_barber=bp)
        invitee = get_object_or_404(Barber, pk=barber_id)
        if invitee.id == bp.id:
            return Response({"detail": "Cannot invite yourself."}, status=400)
        mem, created = SalonMembership.objects.get_or_create(
            barber=invitee,
            salon=salon,
            defaults={
                "role": SalonMembership.Role.WORKER,
                "invite_state": SalonMembership.InviteState.INVITED,
            },
        )
        if not created and mem.invite_state == SalonMembership.InviteState.ACTIVE:
            return Response({"detail": "Already active."}, status=400)
        from django.utils import timezone

        mem.role = SalonMembership.Role.WORKER
        mem.invite_state = SalonMembership.InviteState.INVITED
        mem.invited_at = timezone.now()
        mem.save()
        notify_barber(
            invitee,
            "salon_invite",
            f"Taklif: {salon.name}",
            f"{salon.name} sizni barber sifatida taklif qildi. Rozimisiz?",
            {"salon_id": salon.id, "membership_id": mem.id},
        )
        return Response(SalonMembershipSerializer(mem).data)

    @action(detail=True, methods=["post"])
    def accept_worker(self, request, pk=None):
        mem = self.get_object()
        bp = request_barber(request)
        if bp is None or mem.barber_id != bp.id:
            return Response(status=403)
        if mem.invite_state != SalonMembership.InviteState.INVITED:
            return Response({"detail": "Invalid state."}, status=400)
        try:
            lat = float(request.data["latitude"])
            lng = float(request.data["longitude"])
        except (KeyError, TypeError, ValueError):
            return Response(
                {
                    "detail": "Salon joylashuvingiz bilan mos kelishi uchun latitude va longitude yuboring.",
                },
                status=400,
            )
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
            return Response({"detail": "latitude / longitude noto‘g‘ri."}, status=400)
        dist_km = haversine_km(
            lat, lng, float(mem.salon.latitude), float(mem.salon.longitude)
        )
        if dist_km > JOIN_MAX_DISTANCE_KM:
            return Response({"detail": LOCATION_MISMATCH_MSG}, status=400)
        BarberProfile.objects.update_or_create(
            barber=bp,
            defaults={
                "latitude": lat,
                "longitude": lng,
            },
        )
        mem.invite_state = SalonMembership.InviteState.WORKER_ACCEPTED
        mem.experience_years = request.data.get("experience_years", mem.experience_years)
        mem.save()
        notify_barber(
            mem.salon.owner_barber,
            "worker_accepted",
            f"Barber: {bp.full_name or bp.email}",
            "Ishchi arizani qabul qildi. Tasdiqlang.",
            {"membership_id": mem.id},
        )
        return Response(SalonMembershipSerializer(mem).data)

    @action(detail=True, methods=["post"])
    def decline_worker(self, request, pk=None):
        mem = self.get_object()
        bp = request_barber(request)
        if bp is None or mem.barber_id != bp.id:
            return Response(status=403)
        if mem.invite_state != SalonMembership.InviteState.INVITED:
            return Response({"detail": "Invalid state."}, status=400)
        mem.invite_state = SalonMembership.InviteState.DECLINED
        mem.save(update_fields=["invite_state"])
        notify_barber(
            mem.salon.owner_barber,
            "invite_declined",
            "Taklif rad etildi",
            f"{bp.full_name or bp.email} «{mem.salon.name}» taklifini rad etdi.",
            {"membership_id": mem.id, "salon_id": mem.salon.id},
        )
        return Response(SalonMembershipSerializer(mem).data)

    @action(detail=True, methods=["post"])
    def owner_confirm(self, request, pk=None):
        mem = self.get_object()
        bp = request_barber(request)
        if bp is None or mem.salon.owner_barber_id != bp.id:
            return Response(status=403)
        if mem.invite_state != SalonMembership.InviteState.WORKER_ACCEPTED:
            return Response({"detail": "Worker must accept first."}, status=400)
        try:
            prof = mem.barber.profile
        except BarberProfile.DoesNotExist:
            return Response(
                {
                    "detail": "Ishchining joylashuvi kiritilmagan. Ishchi avval profilida joylashuvni sozlasin.",
                },
                status=400,
            )
        if prof.latitude is None or prof.longitude is None:
            return Response(
                {
                    "detail": "Ishchining joylashuvi kiritilmagan. Ishchi avval profilida joylashuvni sozlasin.",
                },
                status=400,
            )
        dist_km = haversine_km(
            float(prof.latitude),
            float(prof.longitude),
            float(mem.salon.latitude),
            float(mem.salon.longitude),
        )
        if dist_km > JOIN_MAX_DISTANCE_KM:
            return Response({"detail": LOCATION_MISMATCH_MSG}, status=400)
        mem.owner_approved = True
        mem.invite_state = SalonMembership.InviteState.ACTIVE
        from django.utils import timezone

        mem.activated_at = timezone.now()
        mem.save()
        notify_barber(
            mem.barber,
            "membership_active",
            f"{mem.salon.name} — tabrik",
            f"Siz {mem.salon.name} salonida barbersiz.",
            send_email=True,
        )
        return Response(SalonMembershipSerializer(mem).data)

    @action(detail=True, methods=["post"])
    def remove_worker(self, request, pk=None):
        mem = self.get_object()
        bp = request_barber(request)
        if bp is None:
            return Response(status=403)
        is_owner = mem.salon.owner_barber_id == bp.id
        is_self = mem.barber_id == bp.id
        if not is_owner and not is_self:
            return Response(status=403)
        if mem.role == SalonMembership.Role.OWNER:
            return Response({"detail": "Owner membership ni bu endpoint orqali o'chirib bo'lmaydi."}, status=400)
        mem.invite_state = SalonMembership.InviteState.DECLINED
        mem.owner_approved = False
        mem.save(update_fields=["invite_state", "owner_approved"])
        return Response({"status": "removed", "membership_id": mem.id})


class BarberScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = BarberWorkingHoursSerializer
    permission_classes = [IsAuthenticatedBarberAware]

    def get_queryset(self):
        mid = self.request.query_params.get("membership")
        qs = BarberWorkingHours.objects.select_related("membership")
        bp = request_barber(self.request)
        if bp is None:
            return qs.none()
        qs = qs.filter(Q(membership__barber=bp) | Q(membership__salon__owner_barber=bp))
        if mid:
            qs = qs.filter(membership_id=mid)
        return qs

    def perform_create(self, serializer):
        mem = serializer.validated_data["membership"]
        bp = request_barber(self.request)
        is_self = bp is not None and mem.barber_id == bp.id
        is_owner = bp is not None and mem.salon.owner_barber_id == bp.id
        if not is_self and not is_owner:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        serializer.save()
