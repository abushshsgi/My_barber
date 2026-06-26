from datetime import datetime

from django.db import transaction
from django.db.models import Q

from rest_framework import serializers

from accounts.auth_utils import is_platform_admin
from accounts.models import User
from .models import (
    Amenity,
    BarberWorkingHours,
    CatalogService,
    Salon,
    SalonAmenity,
    SalonHours,
    SalonImage,
    SalonMembership,
    Service,
)


def _salon_cover_url(salon, context: dict | None = None) -> str | None:
    if not salon.cover_image:
        return None
    context = context or {}
    request = context.get("request")
    url = salon.cover_image.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class SalonHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalonHours
        fields = ("weekday", "open_time", "close_time")


class SalonImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalonImage
        fields = ("id", "image", "sort_order")


class ServiceSerializer(serializers.ModelSerializer):
    catalog_service = serializers.PrimaryKeyRelatedField(
        queryset=CatalogService.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    name = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id",
            "salon",
            "barber",
            "catalog_service",
            "name",
            "price",
            "duration_minutes",
            "is_active",
            "image_url",
        )
        read_only_fields = ("id", "salon", "name", "duration_minutes", "image_url")

    def validate_price(self, value):
        from barbers.pricing import MIN_SERVICE_PRICE_ERROR, MIN_SERVICE_PRICE_UZS

        if value <= 0:
            raise serializers.ValidationError("Narx 0 dan katta bo'lishi kerak.")
        if value < MIN_SERVICE_PRICE_UZS:
            raise serializers.ValidationError(MIN_SERVICE_PRICE_ERROR)
        return value

    def get_name(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.name
        return obj.name

    def get_duration_minutes(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.duration_minutes
        return obj.duration_minutes

    def get_image_url(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.image_url
        return ""


class PublicServiceSerializer(serializers.ModelSerializer):
    """Mijozlar uchun salon sahifasida — faqat band qilish uchun kerakli maydonlar."""

    name = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    catalog_service = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ("id", "barber", "catalog_service", "name", "price", "duration_minutes", "image_url")

    def get_name(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.name
        return obj.name

    def get_duration_minutes(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.duration_minutes
        return obj.duration_minutes

    def get_image_url(self, obj):
        if obj.catalog_service_id and obj.catalog_service:
            return obj.catalog_service.image_url
        return ""

    def get_catalog_service(self, obj):
        return obj.catalog_service_id


class SalonListSerializer(serializers.ModelSerializer):
    cover_image = serializers.SerializerMethodField()
    # get_queryset annotate bilan beriladi (N+1 oldini olish)
    rating_avg = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)
    price_from = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()

    class Meta:
        model = Salon
        fields = (
            "id",
            "name",
            "slug",
            "cover_image",
            "latitude",
            "longitude",
            "address",
            "premium",
            "is_published",
            "rating_avg",
            "review_count",
            "price_from",
            "amenities",
        )

    def _amenity_lang(self) -> str:
        request = self.context.get("request")
        if request is None:
            return "uz"
        raw = (request.query_params.get("lang") or request.headers.get("Accept-Language") or "uz").split(",")[0]
        code = raw.strip().lower().split("-")[0]
        return code if code in ("uz", "ru", "en") else "uz"

    def get_price_from(self, obj):
        pf = getattr(obj, "price_from", None)
        if pf is None:
            return 0
        try:
            return float(pf)
        except (TypeError, ValueError):
            return 0

    def get_amenities(self, obj):
        lang = self._amenity_lang()
        links = getattr(obj, "_prefetched_objects_cache", {}).get("salon_amenities")
        if links is None:
            links = obj.salon_amenities.select_related("amenity").all()
        out = []
        for link in links:
            amenity = link.amenity
            labels = amenity.labels or {}
            label = labels.get(lang) or labels.get("uz") or amenity.code
            out.append({"code": amenity.code, "icon": amenity.icon, "label": label})
        return out

    def get_cover_image(self, obj):
        return _salon_cover_url(obj, self.context)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        ra = data.get("rating_avg")
        if ra is not None:
            try:
                data["rating_avg"] = round(float(ra), 2)
            except (TypeError, ValueError):
                data["rating_avg"] = 0.0
        return data


class SalonDetailSerializer(serializers.ModelSerializer):
    hours = SalonHoursSerializer(many=True, read_only=True)
    images = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    amenities = serializers.SerializerMethodField()
    owner_id = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Salon
        fields = (
            "id",
            "owner_id",
            "name",
            "slug",
            "description",
            "cover_image",
            "latitude",
            "longitude",
            "address",
            "phone",
            "premium",
            "languages",
            "closed_weekdays",
            "is_published",
            "hours",
            "images",
            "services",
            "amenities",
            "rating_avg",
            "review_count",
            "created_at",
        )

    def _amenity_lang(self) -> str:
        request = self.context.get("request")
        if request is None:
            return "uz"
        raw = (request.query_params.get("lang") or request.headers.get("Accept-Language") or "uz").split(",")[0]
        code = raw.strip().lower().split("-")[0]
        return code if code in ("uz", "ru", "en") else "uz"

    def get_amenities(self, obj):
        lang = self._amenity_lang()
        links = getattr(obj, "_prefetched_objects_cache", {}).get("salon_amenities")
        if links is None:
            links = obj.salon_amenities.select_related("amenity").all()
        out = []
        for link in links:
            amenity = link.amenity
            labels = amenity.labels or {}
            label = labels.get(lang) or labels.get("uz") or amenity.code
            out.append({"code": amenity.code, "icon": amenity.icon, "label": label})
        return out

    def get_owner_id(self, obj):
        return obj.owner_barber_id or obj.owner_id

    def get_rating_avg(self, obj):
        from django.db.models import Avg

        agg = obj.reviews.aggregate(a=Avg("rating"))
        return round(agg["a"] or 0, 2)

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_cover_image(self, obj):
        return _salon_cover_url(obj, self.context)

    def get_images(self, obj):
        return SalonImageSerializer(obj.images.all(), many=True, context=self.context).data

    def get_services(self, obj):
        from django.core.cache import cache

        from barbers.salon_service_sync import sync_all_barber_services_for_barber

        cache_key = f"salon_services_sync:{obj.id}"
        if not cache.get(cache_key):
            for mem in SalonMembership.objects.filter(
                salon=obj,
                invite_state=SalonMembership.InviteState.ACTIVE,
            ).select_related("barber"):
                if mem.barber_id:
                    sync_all_barber_services_for_barber(mem.barber)
            cache.set(cache_key, 1, 60)
        qs = obj.services.filter(is_active=True).filter(
            Q(catalog_service__isnull=True) | Q(catalog_service__is_active=True)
        ).order_by("name")
        return PublicServiceSerializer(qs, many=True, context=self.context).data


class BarberSalonViewSerializer(serializers.ModelSerializer):
    """
    Barber panel uchun read-only salon ko‘rinishi.
    Ataylab services/booking/analytics kabi operatsion bloklar yo‘q.
    """

    hours = SalonHoursSerializer(many=True, read_only=True)
    images = SalonImageSerializer(many=True, read_only=True)
    owner_id = serializers.SerializerMethodField()
    rating_avg = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Salon
        fields = (
            "id",
            "owner_id",
            "name",
            "slug",
            "description",
            "cover_image",
            "latitude",
            "longitude",
            "address",
            "phone",
            "premium",
            "languages",
            "closed_weekdays",
            "is_published",
            "hours",
            "images",
            "rating_avg",
            "review_count",
            "created_at",
        )

    def get_owner_id(self, obj):
        return obj.owner_barber_id or obj.owner_id

    def get_rating_avg(self, obj):
        from django.db.models import Avg

        agg = obj.reviews.aggregate(a=Avg("rating"))
        return round(agg["a"] or 0, 2)

    def get_review_count(self, obj):
        return obj.reviews.count()


class ServiceCreateNestedSerializer(serializers.Serializer):
    """Salon yaratishda bir so‘rovda xizmatlar (atomik saqlash)."""

    name = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=12, decimal_places=2)
    duration_minutes = serializers.IntegerField(min_value=1, max_value=1440)

    def validate_name(self, value):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Xizmat nomi bo‘sh bo‘lmasin.")
        return v

    def validate_price(self, value):
        from barbers.pricing import MIN_SERVICE_PRICE_ERROR, MIN_SERVICE_PRICE_UZS

        if value <= 0:
            raise serializers.ValidationError("Narx 0 dan katta bo'lishi kerak.")
        if value < MIN_SERVICE_PRICE_UZS:
            raise serializers.ValidationError(MIN_SERVICE_PRICE_ERROR)
        return value


class SalonCreateUpdateSerializer(serializers.ModelSerializer):
    hours = SalonHoursSerializer(many=True, required=False)
    services = ServiceCreateNestedSerializer(
        many=True,
        required=False,
        write_only=True,
    )
    amenity_codes = serializers.ListField(
        child=serializers.SlugField(),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Salon
        fields = (
            "id",
            "name",
            "description",
            "cover_image",
            "latitude",
            "longitude",
            "address",
            "phone",
            "premium",
            "languages",
            "closed_weekdays",
            "is_published",
            "hours",
            "services",
            "amenity_codes",
        )

    def validate(self, attrs):
        name = attrs.get("name")
        if name is not None:
            name = name.strip()
            if not name:
                raise serializers.ValidationError(
                    {"name": "Salon nomi bo‘sh bo‘lishi mumkin emas."}
                )
            attrs["name"] = name
            qs = Salon.objects.filter(name__iexact=name)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "name": "Bu nom bilan salon allaqachon mavjud. Boshqa nom tanlang.",
                    }
                )

        request = self.context.get("request")
        if request and request.user.is_authenticated:
            admin = is_platform_admin(request)
            if self.instance is None:
                # Barber yaratgan salon darhol chop etiladi (admin tasdig'i talab qilinmaydi).
                if not admin:
                    attrs["is_published"] = True
            elif not admin:
                attrs.pop("is_published", None)

        if self.instance is None:
            services = attrs.get("services")
            if not services:
                attrs["services"] = []
        return attrs

    def _sync_amenities(self, salon, codes: list[str] | None):
        if codes is None:
            return
        normalized = []
        for code in codes:
            c = (code or "").strip()
            if c and c not in normalized:
                normalized.append(c)
        amenities = list(Amenity.objects.filter(code__in=normalized))
        found = {a.code for a in amenities}
        missing = [c for c in normalized if c not in found]
        if missing:
            raise serializers.ValidationError(
                {"amenity_codes": f"Unknown amenity codes: {', '.join(missing)}"}
            )
        SalonAmenity.objects.filter(salon=salon).exclude(amenity__code__in=normalized).delete()
        existing = set(
            SalonAmenity.objects.filter(salon=salon, amenity__code__in=normalized).values_list(
                "amenity__code", flat=True
            )
        )
        for amenity in amenities:
            if amenity.code not in existing:
                SalonAmenity.objects.create(salon=salon, amenity=amenity)

    def create(self, validated_data):
        hours_data = validated_data.pop("hours", [])
        services_data = validated_data.pop("services", [])
        amenity_codes = validated_data.pop("amenity_codes", None)
        request = self.context.get("request")
        # perform_create already passes owner_barber via serializer.save(owner_barber=bp).
        # Only set it here if not already provided (e.g. admin creates on behalf of a barber).
        if "owner_barber" not in validated_data and request is not None:
            from accounts.auth_utils import request_barber

            bp = request_barber(request)
            if bp is not None:
                validated_data["owner_barber"] = bp
        owner = validated_data.get("owner_barber")
        with transaction.atomic():
            salon = Salon.objects.create(**validated_data)
            for h in hours_data:
                SalonHours.objects.create(salon=salon, **h)
            for s in services_data:
                Service.objects.create(
                    salon=salon,
                    barber=owner,
                    name=s["name"],
                    price=s["price"],
                    duration_minutes=s["duration_minutes"],
                    is_active=True,
                )
            if amenity_codes is not None:
                self._sync_amenities(salon, amenity_codes)
        if owner is not None:
            from barbers.salon_service_sync import sync_all_barber_services_for_barber

            sync_all_barber_services_for_barber(owner)
        return salon

    def update(self, instance, validated_data):
        validated_data.pop("services", None)
        amenity_codes = validated_data.pop("amenity_codes", None)
        hours_data = validated_data.pop("hours", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if hours_data is not None:
            instance.hours.all().delete()
            for h in hours_data:
                SalonHours.objects.create(salon=instance, **h)
        if amenity_codes is not None:
            self._sync_amenities(instance, amenity_codes)
        return instance


class SalonMembershipSerializer(serializers.ModelSerializer):
    barber_detail = serializers.SerializerMethodField()
    salon_name = serializers.CharField(source="salon.name", read_only=True)

    class Meta:
        model = SalonMembership
        fields = (
            "id",
            "barber",
            "barber_detail",
            "salon",
            "salon_name",
            "role",
            "invite_state",
            "owner_approved",
            "experience_years",
            "invited_at",
            "activated_at",
        )
        read_only_fields = ("id", "invited_at", "activated_at")

    def get_barber_detail(self, obj):
        b = obj.barber
        return {"id": b.id, "email": b.email, "full_name": b.full_name, "phone": b.phone}


class BarberWorkingHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = BarberWorkingHours
        fields = ("id", "membership", "weekday", "open_time", "close_time", "is_day_off", "breaks")

    def validate_breaks(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("breaks must be a list.")
        for item in value:
            if not isinstance(item, dict):
                raise serializers.ValidationError("Each break must be an object with start/end.")
            if "start" not in item or "end" not in item:
                raise serializers.ValidationError("Each break needs start and end (HH:MM).")
            try:
                st = datetime.strptime(str(item["start"]), "%H:%M").time()
                et = datetime.strptime(str(item["end"]), "%H:%M").time()
            except (TypeError, ValueError):
                raise serializers.ValidationError("Break start/end must be HH:MM.")
            if st >= et:
                raise serializers.ValidationError("Break start must be before end.")
        return value

    def validate_weekday(self, value):
        if value < 0 or value > 6:
            raise serializers.ValidationError("weekday must be between 0 and 6.")
        return value

    def validate(self, attrs):
        open_time = attrs.get("open_time", getattr(self.instance, "open_time", None))
        close_time = attrs.get("close_time", getattr(self.instance, "close_time", None))
        is_day_off = attrs.get("is_day_off", getattr(self.instance, "is_day_off", False))
        if not is_day_off and open_time and close_time and open_time >= close_time:
            raise serializers.ValidationError({"close_time": "Yopilish vaqti ochilishdan keyin bo'lishi kerak."})
        return attrs

