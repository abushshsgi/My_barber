from django.db import transaction

from rest_framework import serializers

from accounts.auth_utils import is_platform_admin
from accounts.models import User
from .models import BarberWorkingHours, Salon, SalonHours, SalonImage, SalonMembership, Service


class SalonHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalonHours
        fields = ("weekday", "open_time", "close_time")


class SalonImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalonImage
        fields = ("id", "image", "sort_order")


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = (
            "id",
            "salon",
            "barber",
            "name",
            "price",
            "duration_minutes",
            "is_active",
        )
        read_only_fields = ("id", "salon")


class PublicServiceSerializer(serializers.ModelSerializer):
    """Mijozlar uchun salon sahifasida — faqat band qilish uchun kerakli maydonlar."""

    class Meta:
        model = Service
        fields = ("id", "name", "price", "duration_minutes")


class SalonListSerializer(serializers.ModelSerializer):
    cover_image = serializers.ImageField(read_only=True)
    # get_queryset annotate bilan beriladi (N+1 oldini olish)
    rating_avg = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

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
        )

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
    images = SalonImageSerializer(many=True, read_only=True)
    services = serializers.SerializerMethodField()
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

    def get_services(self, obj):
        qs = obj.services.filter(is_active=True).order_by("name")
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


class SalonCreateUpdateSerializer(serializers.ModelSerializer):
    hours = SalonHoursSerializer(many=True, required=False)
    services = ServiceCreateNestedSerializer(
        many=True,
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
                if request and is_platform_admin(request):
                    attrs["services"] = []
                else:
                    raise serializers.ValidationError(
                        {"services": "Kamida bitta xizmat kiriting."}
                    )
        return attrs

    def create(self, validated_data):
        hours_data = validated_data.pop("hours", [])
        services_data = validated_data.pop("services", [])
        request = self.context.get("request")
        # perform_create already passes owner_barber via serializer.save(owner_barber=bp).
        # Only set it here if not already provided (e.g. admin creates on behalf of a barber).
        if "owner_barber" not in validated_data and request is not None:
            from accounts.auth_utils import request_barber

            bp = request_barber(request)
            if bp is not None:
                validated_data["owner_barber"] = bp
        with transaction.atomic():
            salon = Salon.objects.create(**validated_data)
            for h in hours_data:
                SalonHours.objects.create(salon=salon, **h)
            for s in services_data:
                Service.objects.create(
                    salon=salon,
                    name=s["name"],
                    price=s["price"],
                    duration_minutes=s["duration_minutes"],
                    is_active=True,
                )
        return salon

    def update(self, instance, validated_data):
        validated_data.pop("services", None)
        hours_data = validated_data.pop("hours", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        if hours_data is not None:
            instance.hours.all().delete()
            for h in hours_data:
                SalonHours.objects.create(salon=instance, **h)
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
        fields = ("id", "membership", "weekday", "open_time", "close_time", "is_day_off")

