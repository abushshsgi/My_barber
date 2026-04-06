from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from bookings.models import Booking, BookingCompletion, BookingLine, Review
from barbers.models import Barber, BarberProfile, BarberService
from salons.models import Salon, SalonMembership, Service

User = get_user_model()


class BookingLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingLine
        fields = ("id", "service", "barber_service", "service_name", "price", "duration_minutes")


class BookingSerializer(serializers.ModelSerializer):
    lines = BookingLineSerializer(many=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(read_only=True)
    salon_name = serializers.SerializerMethodField()
    barber_name = serializers.CharField(source="barber.full_name", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "salon",
            "salon_name",
            "barber",
            "barber_name",
            "start_at",
            "end_at",
            "status",
            "total_price",
            "lines",
            "created_at",
        )
        read_only_fields = ("id", "customer", "customer_phone", "end_at", "total_price", "created_at")

    def get_salon_name(self, obj):
        return obj.salon.name if obj.salon_id else None


class BookingCreateSerializer(serializers.Serializer):
    salon = serializers.PrimaryKeyRelatedField(
        queryset=Salon.objects.filter(is_published=True),
        required=False,
        allow_null=True,
    )
    barber = serializers.PrimaryKeyRelatedField(queryset=Barber.objects.all())
    start_at = serializers.DateTimeField()
    service_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1, required=False)
    barber_service_ids = serializers.ListField(
        child=serializers.IntegerField(), min_length=1, required=False
    )

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            phone = (getattr(request.user, "phone", None) or "").strip()
            if not phone:
                raise serializers.ValidationError(
                    {"detail": "Bron qilish uchun profilda telefon raqamini kiriting."}
                )

        barber = attrs["barber"]
        salon = attrs.get("salon", None)
        start_at = attrs["start_at"]
        service_ids = attrs.get("service_ids") or []
        barber_service_ids = attrs.get("barber_service_ids") or []

        is_salon_flow = salon is not None
        if is_salon_flow and not service_ids:
            raise serializers.ValidationError({"service_ids": "service_ids required for salon booking."})
        if (not is_salon_flow) and not barber_service_ids:
            raise serializers.ValidationError(
                {"barber_service_ids": "barber_service_ids required for independent booking."}
            )

        if is_salon_flow:
            if not SalonMembership.objects.filter(
                barber=barber,
                salon=salon,
                invite_state=SalonMembership.InviteState.ACTIVE,
            ).exists():
                raise serializers.ValidationError({"barber": "Barber is not active in this salon."})

            services = list(
                Service.objects.filter(
                    id__in=service_ids,
                    salon=salon,
                    is_active=True,
                )
            )
            if len(services) != len(set(service_ids)):
                raise serializers.ValidationError("Invalid or duplicate services.")
        else:
            if not BarberProfile.objects.filter(barber=barber).exists():
                raise serializers.ValidationError({"barber": "Barber profile not found."})
            services = list(
                BarberService.objects.filter(
                    profile__barber=barber,
                    id__in=barber_service_ids,
                    is_active=True,
                )
            )
            if len(services) != len(set(barber_service_ids)):
                raise serializers.ValidationError("Invalid or duplicate barber services.")

        total_minutes = sum(s.duration_minutes for s in services)
        total_price = sum(s.price for s in services)
        end_at = start_at + timedelta(minutes=total_minutes)

        blocking = Booking.objects.filter(
            barber=barber,
            status__in=[
                Booking.Status.PENDING,
                Booking.Status.ACCEPTED,
                Booking.Status.IN_PROGRESS,
            ],
            start_at__lt=end_at,
            end_at__gt=start_at,
        )
        if blocking.exists():
            raise serializers.ValidationError("Selected time overlaps another booking.")

        attrs["_services"] = services
        attrs["_is_salon_flow"] = is_salon_flow
        attrs["_total_minutes"] = total_minutes
        attrs["_total_price"] = total_price
        attrs["_end_at"] = end_at
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        from bookings.slot_lock import booking_slot_lock

        request = self.context["request"]
        customer = request.user
        validated_data.pop("service_ids", None)
        validated_data.pop("barber_service_ids", None)
        is_salon_flow = bool(validated_data.pop("_is_salon_flow", False))
        salon = validated_data.get("salon", None)
        barber = validated_data["barber"]
        start_at = validated_data["start_at"]
        services = validated_data.pop("_services")
        end_at = validated_data.pop("_end_at")
        total_price = validated_data.pop("_total_price")

        phone_snap = (getattr(customer, "phone", None) or "").strip()

        with booking_slot_lock(barber.id, start_at, end_at) as acquired:
            if not acquired:
                raise serializers.ValidationError(
                    {
                        "detail": "Bu vaqt oralig‘i hozir band qilinmoqda. Boshqa slot tanlang yoki qayta urinib ko‘ring."
                    }
                )
            blocking = Booking.objects.filter(
                barber=barber,
                status__in=[
                    Booking.Status.PENDING,
                    Booking.Status.ACCEPTED,
                    Booking.Status.IN_PROGRESS,
                ],
                start_at__lt=end_at,
                end_at__gt=start_at,
            ).exists()
            if blocking:
                raise serializers.ValidationError(
                    {"detail": "Tanlangan vaqt boshqa bron bilan ustma-ust tushdi."}
                )

            booking = Booking.objects.create(
                customer=customer,
                salon=salon,
                barber=barber,
                start_at=start_at,
                end_at=end_at,
                status=Booking.Status.PENDING,
                total_price=total_price,
                customer_phone=phone_snap,
            )
            for s in services:
                if is_salon_flow:
                    BookingLine.objects.create(
                        booking=booking,
                        service=s,
                        service_name=s.name,
                        price=s.price,
                        duration_minutes=s.duration_minutes,
                    )
                else:
                    BookingLine.objects.create(
                        booking=booking,
                        barber_service=s,
                        service_name=s.name,
                        price=s.price,
                        duration_minutes=s.duration_minutes,
                    )
        return booking


class BookingCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingCompletion
        fields = ("result_image", "portfolio_allowed", "actual_end_at", "completed_at")


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "booking",
            "author_name",
            "rating",
            "text",
            "photo",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "author_name")

    def validate_booking(self, booking):
        user = self.context["request"].user
        if booking.customer_id != user.id:
            raise serializers.ValidationError("Not your booking.")
        if booking.status != Booking.Status.COMPLETED:
            raise serializers.ValidationError("Booking not completed.")
        if hasattr(booking, "review"):
            raise serializers.ValidationError("Already reviewed.")
        return booking

    def create(self, validated_data):
        booking = validated_data["booking"]
        validated_data["author"] = self.context["request"].user
        validated_data["salon"] = booking.salon
        validated_data["barber"] = booking.barber
        return super().create(validated_data)
