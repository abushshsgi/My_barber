from django.core.files.base import File
from django.db import transaction
from django.db.models import Avg, Count, FloatField, Min, Q, Value
from django.db.models.functions import Cast, Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from accounts.customer_permissions import IsAuthenticatedCustomer
from barbers.activation_permissions import IsAuthenticatedBarberAware
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_utils import customer_catalog_region, is_platform_admin, request_barber
from accounts.uz_regions import UzRegion
from accounts.throttles import SalonJoinThrottle, SalonSearchThrottle
from barbers.models import Barber, BarberProfile
from barbers.readiness import barber_is_publicly_visible, barber_is_staff_listable
from notifications.utils import notify_barber, notify_user

from .geo_join import (
    JOIN_MAX_DISTANCE_KM,
    LOCATION_MISMATCH_MSG,
    assert_join_distance_ok,
    haversine_km,
)
from .join_service import attach_worker_membership
from .models import (
    BarberScheduleException,
    CatalogService,
    BarberWorkingHours,
    FavoriteSalon,
    Salon,
    SalonImage,
    SalonMembership,
    Service,
)
from .owner_setup import (
    ensure_owner_membership_active,
    owner_is_salon_bookable,
    sync_owner_profile_location_from_salon,
    sync_owner_region_from_salon,
)
from .serializers import (
    BarberScheduleExceptionSerializer,
    BarberWorkingHoursSerializer,
    BarberSalonViewSerializer,
    PublicServiceSerializer,
    SalonCatalogServiceSerializer,
    SalonCreateUpdateSerializer,
    SalonDetailSerializer,
    SalonImageSerializer,
    SalonListSerializer,
    SalonMembershipSerializer,
)


def _salon_review_score_expr():
    """Salon bahosi: `salon_rating` ustuni bo'lsa Coalesce, bo'lmasa eski `rating`.

    Migrate kechikkan deploylarda 500 (ProgrammingError) oldini oladi.
    """
    from bookings.db_compat import reviews_has_salon_rating_column

    if reviews_has_salon_rating_column():
        return Coalesce("reviews__salon_rating", "reviews__rating")
    return "reviews__rating"


def _barber_owns_salon(bp: Barber | None, salon: Salon) -> bool:
    if bp is None:
        return False
    if salon.owner_barber_id == bp.id:
        return True
    return SalonMembership.objects.filter(
        salon=salon,
        barber=bp,
        role=SalonMembership.Role.OWNER,
        invite_state=SalonMembership.InviteState.ACTIVE,
    ).exists()


def _delete_salon_catalog_service_for_owner(bp: Barber, service: Service) -> None:
    """Salon katalogi qatorini va bog'langan BarberService ni o'chirish."""
    from barbers.models import BarberProfile, BarberService

    if service.catalog_service_id:
        prof = BarberProfile.objects.filter(barber=bp).first()
        if prof:
            BarberService.objects.filter(
                profile=prof,
                catalog_service_id=service.catalog_service_id,
            ).delete()
    service.delete()


class SalonViewSet(viewsets.ModelViewSet):
    lookup_field = "pk"

    def get_permissions(self):
        if self.action in (
            "list",
            "retrieve",
            "nearby",
            "staff",
            "rating_summary",
            "search",
            "barber_services",
        ):
            return [AllowAny()]
        return [IsAuthenticatedBarberAware()]

    def _salon_public_list_qs(self):
        """Ro‘yxat va nearby uchun: reyting/sharhlar soni bitta so‘rovda."""
        # PostgreSQL: Coalesce(Avg(..), Value(0)) integer/numeric aralashmasi 500 beradi — FloatField bilan bir xil.
        score = _salon_review_score_expr()
        return (
            Salon.objects.filter(is_published=True)
            .select_related("owner", "owner_barber")
            .prefetch_related("salon_amenities__amenity", "images")
            .annotate(
                review_count=Count("reviews", distinct=True),
                rating_avg=Coalesce(
                    Cast(Avg(score), FloatField()),
                    Value(0.0),
                    output_field=FloatField(),
                ),
                price_from=Min(
                    "services__price",
                    filter=Q(services__is_active=True),
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

    def _apply_audience_salon_type(self, qs):
        """
        audience=men → sartaroshxona; audience=women → go‘zallik.
        business_kind=barbershop|beauty_salon — to‘g‘ridan-to‘g‘ri filtr.
        """
        r = self.request.query_params
        business_kind = (r.get("business_kind") or r.get("salon_type") or "").strip().lower()
        audience = (r.get("audience") or "").strip().lower()
        if business_kind == "beauty":
            business_kind = Salon.BusinessKind.BEAUTY_SALON
        if business_kind in (Salon.BusinessKind.BARBERSHOP, Salon.BusinessKind.BEAUTY_SALON):
            return qs.filter(business_kind=business_kind)
        if audience == "men":
            return qs.filter(
                Q(business_kind=Salon.BusinessKind.BARBERSHOP) | Q(business_kind="")
            )
        if audience == "women":
            return qs.filter(
                Q(business_kind=Salon.BusinessKind.BEAUTY_SALON) | Q(business_kind="")
            )
        return qs

    def get_queryset(self):
        qs = Salon.objects.select_related("owner", "owner_barber")
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "images",
                "hours",
                "services",
                "services__catalog_service",
                "salon_amenities__amenity",
            )

        if self.action == "list":
            qs = self._apply_audience_salon_type(
                self._apply_public_salon_region(self._salon_public_list_qs())
            )
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
            return self._apply_audience_salon_type(
                self._apply_public_salon_region(self._salon_public_list_qs())
            )

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
        sync_owner_region_from_salon(bp, salon, force=True)
        sync_owner_profile_location_from_salon(bp, salon)
        ensure_owner_membership_active(bp, salon)

    def perform_update(self, serializer):
        salon = self.get_object()
        bp = request_barber(self.request)
        allowed = is_platform_admin(self.request) or (
            bp is not None and salon.owner_barber_id == bp.id
        )
        if not allowed:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        salon = serializer.save()
        if bp is not None and salon.owner_barber_id == bp.id:
            sync_owner_region_from_salon(bp, salon, force=True)
            sync_owner_profile_location_from_salon(bp, salon)
            ensure_owner_membership_active(bp, salon)

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
            .select_related("owner", "owner_barber")
            .prefetch_related("images")
            .annotate(
                review_count=Count("reviews", distinct=True),
                rating_avg=Coalesce(
                    Cast(Avg(_salon_review_score_expr()), FloatField()),
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
        detail=True,
        methods=["get"],
        permission_classes=[AllowAny],
        url_path="rating-summary",
    )
    def rating_summary(self, request, pk=None):
        from salons.rating_summary import build_rating_summary

        salon = self.get_object()
        return Response(build_rating_summary(salon, request))

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
        qs = self._salon_public_list_qs().filter(
            Q(name__icontains=q) | Q(address__icontains=q) | Q(phone__icontains=q)
        )
        bp = request_barber(request)
        if bp is not None:
            br = (bp.region or "").strip()
            if br:
                qs = qs.filter(owner_barber__region=br)
        else:
            qs = self._apply_public_salon_region(qs)
        qs = self._apply_audience_salon_type(qs)
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

        salon = get_object_or_404(Salon, pk=salon_id, is_published=True)
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

    def _staff_row(self, request, barber, role, experience_years, *, is_bookable: bool):
        avatar = None
        if barber.avatar:
            avatar = request.build_absolute_uri(barber.avatar.url)
        return {
            "id": barber.id,
            "full_name": barber.full_name or barber.email,
            "avatar": avatar,
            "role": role,
            "experience_years": experience_years,
            "is_bookable": is_bookable,
            "gender": barber.gender or "",
        }

    @staticmethod
    def _staff_matches_audience(barber, audience: str, gender: str) -> bool:
        if gender in (Barber.Gender.MALE, Barber.Gender.FEMALE):
            return (barber.gender or "") == gender or not (barber.gender or "")
        if audience == "men":
            return (barber.gender or "") in ("", Barber.Gender.MALE)
        if audience == "women":
            return (barber.gender or "") in ("", Barber.Gender.FEMALE)
        return True

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def staff(self, request, pk=None):
        salon = self.get_object()
        audience = (request.query_params.get("audience") or "").strip().lower()
        gender = (request.query_params.get("gender") or "").strip().lower()
        out = []
        seen: set[int] = set()

        if salon.owner_barber_id:
            owner = salon.owner_barber
            owner_mem = (
                SalonMembership.objects.filter(salon=salon, barber=owner)
                .filter(
                    Q(invite_state=SalonMembership.InviteState.ACTIVE)
                    | Q(
                        role=SalonMembership.Role.OWNER,
                        invite_state=SalonMembership.InviteState.NA,
                    )
                )
                .first()
            )
            if (
                owner_mem
                and barber_is_staff_listable(owner, salon)
                and self._staff_matches_audience(owner, audience, gender)
            ):
                out.append(
                    self._staff_row(
                        request,
                        owner,
                        SalonMembership.Role.OWNER,
                        owner_mem.experience_years,
                        is_bookable=owner_is_salon_bookable(owner, salon),
                    )
                )
                seen.add(owner.id)

        mems = (
            SalonMembership.objects.filter(salon=salon)
            .filter(
                Q(invite_state=SalonMembership.InviteState.ACTIVE)
                | Q(
                    role=SalonMembership.Role.OWNER,
                    invite_state=SalonMembership.InviteState.NA,
                )
            )
            .exclude(barber_id__in=seen)
            .select_related("barber")
            .order_by("id")
        )
        for m in mems:
            b = m.barber
            if not barber_is_publicly_visible(b):
                continue
            if not self._staff_matches_audience(b, audience, gender):
                continue
            out.append(
                self._staff_row(
                    request,
                    b,
                    m.role,
                    m.experience_years,
                    is_bookable=True,
                )
            )
        return Response(out)

    @action(detail=True, methods=["get"], permission_classes=[AllowAny], url_path="barber-services")
    def barber_services(self, request, pk=None):
        """Tanlangan barber uchun salon xizmatlari (umumiy + shu barberga bog‘langan)."""
        salon = self.get_object()
        barber_param = request.query_params.get("barber")
        if not barber_param:
            return Response({"detail": "barber query param required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            barber_id = int(barber_param)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid barber id."}, status=status.HTTP_400_BAD_REQUEST)

        barber = get_object_or_404(Barber, pk=barber_id)
        is_owner = salon.owner_barber_id == barber.id
        in_salon = SalonMembership.objects.filter(
            salon=salon,
            barber=barber,
            invite_state=SalonMembership.InviteState.ACTIVE,
        ).exists()
        if not is_owner and not in_salon:
            return Response({"detail": "Barber bu salonda ishlamaydi."}, status=status.HTTP_404_NOT_FOUND)

        # Salon egasi salon katalogini (barber=null) bron qiladi — uni sync
        # qilish shart emas. Ishchilar uchun shaxsiy xizmatlarni sinxronlaymiz.
        if not is_owner:
            from barbers.salon_service_sync import sync_all_barber_services_for_barber

            sync_all_barber_services_for_barber(barber)
        qs = (
            salon.services.filter(is_active=True)
            .filter(Q(barber__isnull=True) | Q(barber=barber))
            .filter(Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True))
            .select_related("catalog_service", "barber")
            .order_by("name")
        )
        return Response(PublicServiceSerializer(qs, many=True, context={"request": request}).data)

    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[IsAuthenticatedBarberAware],
        url_path="services",
    )
    def services(self, request, pk=None):
        """Salon katalogi (barber=null) — faqat salon egasi boshqaradi."""
        salon = self.get_object()
        bp = request_barber(request)
        is_owner = _barber_owns_salon(bp, salon) or is_platform_admin(request)
        if not is_owner:
            return Response(status=status.HTTP_403_FORBIDDEN)

        if request.method == "GET":
            catalog_filter = Q(barber__isnull=True)
            if bp is not None and salon.owner_barber_id == bp.id:
                catalog_filter |= Q(barber=bp)
            qs = (
                salon.services.filter(catalog_filter)
                .filter(Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True))
                .select_related("catalog_service")
                .order_by("name")
            )
            return Response(
                SalonCatalogServiceSerializer(qs, many=True, context={"request": request}).data
            )

        serializer = SalonCatalogServiceSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        catalog = serializer.validated_data.get("catalog_service")
        if catalog is None:
            return Response(
                {"catalog_service": "Katalogdan xizmat tanlang."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj = serializer.save(
            salon=salon,
            barber=None,
            catalog_service=catalog,
            name=catalog.name,
            duration_minutes=catalog.duration_minutes,
        )
        obj.categories.set(catalog.categories.all())
        return Response(
            SalonCatalogServiceSerializer(obj, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        permission_classes=[IsAuthenticatedBarberAware],
        url_path=r"services/(?P<service_id>[^/.]+)",
    )
    def service_detail(self, request, pk=None, service_id=None):
        """Salon katalogidagi bitta xizmatni tahrirlash/o‘chirish."""
        salon = self.get_object()
        bp = request_barber(request)
        is_owner = _barber_owns_salon(bp, salon) or is_platform_admin(request)
        if not is_owner:
            return Response(status=status.HTTP_403_FORBIDDEN)
        catalog_filter = Q(barber__isnull=True)
        if bp is not None and salon.owner_barber_id == bp.id:
            catalog_filter |= Q(barber=bp)
        service = get_object_or_404(
            Service.objects.filter(catalog_filter),
            pk=service_id,
            salon=salon,
        )
        if request.method == "DELETE":
            if bp is not None and salon.owner_barber_id == bp.id:
                _delete_salon_catalog_service_for_owner(bp, service)
            else:
                service.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = SalonCatalogServiceSerializer(
            service, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def add_images(self, request, pk=None):
        from django.conf import settings

        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        images = request.FILES.getlist("images")
        if not images:
            # Ba'zi klientlar bitta faylni "image" kaliti bilan yuboradi
            single = request.FILES.get("image") or request.FILES.get("file")
            if single is not None:
                images = [single]
        if not images:
            return Response(
                {"detail": "Rasmlar yuborilmadi. `images` maydonida fayl(lar) kerak."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        max_files = int(getattr(settings, "FILE_UPLOAD_MAX_NUMBER_FILES", 40) or 40)
        if len(images) > max_files:
            return Response(
                {"detail": f"Bir so‘rovda ko‘pi bilan {max_files} ta rasm."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_prefixes = ("image/",)
        allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"}
        created_rows = []
        with transaction.atomic():
            order = salon.images.count()
            first_created = None
            for img in images:
                content_type = (getattr(img, "content_type", None) or "").lower()
                name = (getattr(img, "name", None) or "").lower()
                ext = ""
                if "." in name:
                    ext = "." + name.rsplit(".", 1)[-1]
                if content_type and not content_type.startswith(allowed_prefixes):
                    if ext not in allowed_ext:
                        return Response(
                            {"detail": f"Faqat rasm fayllari: {img.name or 'file'}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                created = SalonImage.objects.create(salon=salon, image=img, sort_order=order)
                created_rows.append(created)
                if first_created is None:
                    first_created = created
                order += 1
            # Cover bo‘sh bo‘lsa, gallerydagi birinchi rasmni cover qilib qo‘yamiz
            if first_created is not None and not salon.cover_image:
                try:
                    with first_created.image.open("rb") as src:
                        name = first_created.image.name.split("/")[-1] or "cover.jpg"
                        salon.cover_image.save(name, File(src), save=True)
                except (OSError, ValueError, NotImplementedError):
                    # Cover nusxa olish ixtiyoriy — gallery saqlangan bo‘lsa OK
                    pass

        salon.refresh_from_db()
        return Response(
            {
                "status": "ok",
                "created_count": len(created_rows),
                "images": SalonImageSerializer(
                    created_rows, many=True, context={"request": request}
                ).data,
                "cover_image": SalonDetailSerializer(
                    salon, context={"request": request}
                ).data.get("cover_image"),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def upload_cover(self, request, pk=None):
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        f = request.FILES.get("cover") or request.FILES.get("image") or request.FILES.get("file")
        if not f:
            return Response({"detail": "cover fayl majburiy."}, status=status.HTTP_400_BAD_REQUEST)
        content_type = (getattr(f, "content_type", None) or "").lower()
        if content_type and not content_type.startswith("image/"):
            return Response(
                {"detail": "Faqat rasm fayli yuklash mumkin."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Eski muqovani storage (Postgres StoredMedia / disk) dan o‘chiramiz
        if salon.cover_image:
            try:
                salon.cover_image.delete(save=False)
            except Exception:
                pass
        salon.cover_image.save(f.name, f, save=True)
        salon.refresh_from_db()
        return Response(
            SalonDetailSerializer(salon, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticatedBarberAware])
    def clear_cover(self, request, pk=None):
        """Salon muqova rasmini o‘chirish (galereya rasmlari saqlanadi)."""
        salon = self.get_object()
        bp = request_barber(request)
        if bp is None or salon.owner_barber_id != bp.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if salon.cover_image:
            try:
                salon.cover_image.delete(save=True)
            except Exception:
                salon.cover_image = None
                salon.save(update_fields=["cover_image"])
        else:
            salon.cover_image = None
            salon.save(update_fields=["cover_image"])
        salon.refresh_from_db()
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
        if salon.cover_image:
            try:
                salon.cover_image.delete(save=False)
            except Exception:
                pass
        with si.image.open("rb") as src:
            name = si.image.name.split("/")[-1] or "cover.jpg"
            salon.cover_image.save(name, File(src), save=True)
        salon.refresh_from_db()
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
        si = SalonImage.objects.filter(pk=image_id, salon=salon).first()
        if si is None:
            return Response({"detail": "Rasm topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        try:
            if si.image:
                si.image.delete(save=False)
        except Exception:
            pass
        si.delete()
        for idx, img in enumerate(salon.images.order_by("sort_order", "id")):
            SalonImage.objects.filter(pk=img.pk).update(sort_order=idx)
        return Response({"status": "ok"})

class FavoriteSalonListCreateView(APIView):
    permission_classes = [IsAuthenticatedCustomer]

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
        raw = request.data.get("salon")
        if raw is None or raw == "":
            return Response({"detail": "salon maydoni talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            salon_id = int(raw)
        except (TypeError, ValueError):
            return Response({"detail": "salon butun son bo'lishi kerak."}, status=status.HTTP_400_BAD_REQUEST)
        salon = get_object_or_404(Salon, pk=salon_id, is_published=True)
        row, created = FavoriteSalon.objects.get_or_create(user=request.user, salon=salon)
        return Response(
            {"id": row.id, "salon": salon.id, "created_at": row.created_at.isoformat()},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class FavoriteSalonDetailView(APIView):
    permission_classes = [IsAuthenticatedCustomer]

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


class BarberScheduleExceptionViewSet(viewsets.ModelViewSet):
    """Salon ichidagi ishchi uchun sana bo'yicha jadval istisnolari."""

    serializer_class = BarberScheduleExceptionSerializer
    permission_classes = [IsAuthenticatedBarberAware]

    def get_queryset(self):
        bp = request_barber(self.request)
        if bp is None:
            return BarberScheduleException.objects.none()
        qs = BarberScheduleException.objects.select_related("membership").filter(
            Q(membership__barber=bp) | Q(membership__salon__owner_barber=bp)
        )
        mid = self.request.query_params.get("membership")
        if mid:
            qs = qs.filter(membership_id=mid)
        upcoming = str(self.request.query_params.get("upcoming", "") or "").strip()
        if upcoming in ("1", "true", "yes"):
            from django.utils import timezone

            qs = qs.filter(date__gte=timezone.localdate())
        return qs.order_by("date")

    def perform_create(self, serializer):
        mem = serializer.validated_data["membership"]
        bp = request_barber(self.request)
        is_self = bp is not None and mem.barber_id == bp.id
        is_owner = bp is not None and mem.salon.owner_barber_id == bp.id
        if not is_self and not is_owner:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied()
        serializer.save()
