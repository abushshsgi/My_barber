from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from bookings.availability import (
    assert_booking_slot_available,
    get_independent_services_for_barber,
    get_salon_services_for_barber,
)
from bookings.db_compat import (
    bookings_has_check_in_token_column,
    bookings_has_checked_in_column,
    bookings_has_family_member_column,
    bookings_has_notes_column,
    bookings_has_order_number_column,
    bookings_has_portfolio_consent_column,
    booking_create_compat,
    booking_has_review_for,
    booking_review_fields,
)
from bookings.models import Booking, BookingCompletion, BookingLine, Review
from accounts.models import FamilyMember
from barbers.models import Barber, BarberProfile
from salons.models import Salon, SalonMembership

User = get_user_model()


class BookingLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingLine
        fields = ("id", "service", "barber_service", "service_name", "price", "duration_minutes")


class BookingSerializer(serializers.ModelSerializer):
    lines = BookingLineSerializer(many=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(read_only=True)
    customer_avatar = serializers.SerializerMethodField()
    completed_at = serializers.SerializerMethodField()
    salon_name = serializers.SerializerMethodField()
    barber_name = serializers.CharField(source="barber.full_name", read_only=True)
    has_review = serializers.SerializerMethodField()
    review_id = serializers.SerializerMethodField()
    family_member = serializers.SerializerMethodField()
    booked_for_name = serializers.SerializerMethodField()
    salon_address = serializers.SerializerMethodField()
    salon_latitude = serializers.SerializerMethodField()
    salon_longitude = serializers.SerializerMethodField()
    result_image_url = serializers.SerializerMethodField()
    portfolio_allowed = serializers.SerializerMethodField()
    status_history = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()
    check_in_code = serializers.SerializerMethodField()
    check_in_short_code = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "customer_avatar",
            "family_member",
            "booked_for_name",
            "salon",
            "salon_name",
            "salon_address",
            "salon_latitude",
            "salon_longitude",
            "barber",
            "barber_name",
            "start_at",
            "end_at",
            "started_at",
            "checked_in_at",
            "completed_at",
            "status",
            "total_price",
            "payment_method",
            "payment_status",
            "paid_at",
            "portfolio_consent",
            "portfolio_allowed",
            "result_image_url",
            "order_number",
            "check_in_code",
            "check_in_short_code",
            "status_history",
            "notes",
            "lines",
            "has_review",
            "review_id",
            "created_at",
        )
        read_only_fields = (
            "id",
            "customer",
            "customer_phone",
            "end_at",
            "started_at",
            "checked_in_at",
            "total_price",
            "payment_method",
            "payment_status",
            "paid_at",
            "portfolio_consent",
            "notes",
            "created_at",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not bookings_has_checked_in_column():
            self.fields.pop("checked_in_at", None)
        if not bookings_has_portfolio_consent_column():
            self.fields.pop("portfolio_consent", None)
        if not bookings_has_order_number_column():
            self.fields.pop("order_number", None)
        if not bookings_has_check_in_token_column():
            self.fields.pop("check_in_code", None)
            self.fields.pop("check_in_short_code", None)
        if not bookings_has_notes_column():
            self.fields.pop("notes", None)

    def _is_request_barber(self) -> bool:
        request = self.context.get("request")
        if request is None:
            return False
        from barbers.barber_auth import BarberPrincipal

        return isinstance(getattr(request, "user", None), BarberPrincipal)

    def get_salon_name(self, obj):
        return obj.salon.name if obj.salon_id else None

    def get_customer_avatar(self, obj):
        cust = obj.customer
        if not cust or not cust.avatar:
            return ""
        request = self.context.get("request")
        url = cust.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_completed_at(self, obj):
        completion = getattr(obj, "completion", None)
        if completion and completion.completed_at:
            return completion.completed_at
        return None

    def get_has_review(self, obj):
        has, _ = booking_review_fields(obj)
        return has

    def get_review_id(self, obj):
        _, rid = booking_review_fields(obj)
        return rid

    def get_family_member(self, obj: Booking):
        if not bookings_has_family_member_column():
            return None
        return obj.family_member_id

    def get_booked_for_name(self, obj):
        if bookings_has_family_member_column() and obj.family_member_id and obj.family_member:
            return obj.family_member.name
        return (obj.customer.full_name or "").strip() or obj.customer.get_username()

    def _location_from_salon_or_barber(self, obj):
        if obj.salon_id and obj.salon:
            return {
                "address": (obj.salon.address or "").strip(),
                "latitude": float(obj.salon.latitude) if obj.salon.latitude is not None else None,
                "longitude": float(obj.salon.longitude) if obj.salon.longitude is not None else None,
            }
        prof = getattr(obj.barber, "profile", None)
        if prof:
            return {
                "address": (getattr(prof, "location_text", None) or "").strip(),
                "latitude": float(prof.latitude) if getattr(prof, "latitude", None) is not None else None,
                "longitude": float(prof.longitude) if getattr(prof, "longitude", None) is not None else None,
            }
        return {"address": "", "latitude": None, "longitude": None}

    def get_salon_address(self, obj):
        return self._location_from_salon_or_barber(obj)["address"]

    def get_salon_latitude(self, obj):
        return self._location_from_salon_or_barber(obj)["latitude"]

    def get_salon_longitude(self, obj):
        return self._location_from_salon_or_barber(obj)["longitude"]

    def get_result_image_url(self, obj):
        completion = getattr(obj, "completion", None)
        if not completion or not completion.result_image:
            return None
        request = self.context.get("request")
        url = completion.result_image.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_portfolio_allowed(self, obj):
        completion = getattr(obj, "completion", None)
        return bool(completion and completion.portfolio_allowed)

    def get_order_number(self, obj):
        return obj.order_number or f"MS-{obj.pk}"

    def _checkin_active(self, obj) -> bool:
        """QR token faqat tasdiqlangan va hali check-in bo'lmagan bronda faol."""
        if not bookings_has_check_in_token_column():
            return False
        if not getattr(obj, "check_in_token", None):
            return False
        if getattr(obj, "check_in_token_used_at", None):
            return False
        if getattr(obj, "checked_in_at", None):
            return False
        return obj.status == Booking.Status.ACCEPTED

    def get_check_in_code(self, obj):
        # Token faqat bron egasiga (mijozga) beriladi — sartarosh skaner qiladi.
        if self._is_request_barber():
            return None
        if not self._checkin_active(obj):
            return None
        return obj.check_in_token

    def get_check_in_short_code(self, obj):
        if self._is_request_barber():
            return None
        if not self._checkin_active(obj):
            return None
        return obj.check_in_short_code

    def get_status_history(self, obj):
        history = []
        if obj.created_at:
            history.append(
                {
                    "key": "created",
                    "label": "So'rov yuborildi",
                    "at": obj.created_at.isoformat(),
                }
            )
        if bookings_has_checked_in_column() and obj.checked_in_at:
            history.append(
                {
                    "key": "checked_in",
                    "label": "Mijoz keldi",
                    "at": obj.checked_in_at.isoformat(),
                }
            )
        if obj.status in (
            Booking.Status.ACCEPTED,
            Booking.Status.IN_PROGRESS,
            Booking.Status.COMPLETED,
        ):
            ts = obj.updated_at or obj.created_at
            if ts:
                history.append(
                    {
                        "key": "accepted",
                        "label": "Tasdiqlandi",
                        "at": ts.isoformat(),
                    }
                )
        if obj.started_at:
            history.append(
                {
                    "key": "started",
                    "label": "Xizmat boshlandi",
                    "at": obj.started_at.isoformat(),
                }
            )
        completion = getattr(obj, "completion", None)
        if completion and completion.completed_at:
            history.append(
                {
                    "key": "completed",
                    "label": "Yakunlandi",
                    "at": completion.completed_at.isoformat(),
                }
            )
        elif obj.status == Booking.Status.COMPLETED and obj.updated_at:
            history.append(
                {
                    "key": "completed",
                    "label": "Yakunlandi",
                    "at": obj.updated_at.isoformat(),
                }
            )
        if obj.status == Booking.Status.CANCELLED:
            history.append(
                {
                    "key": "cancelled",
                    "label": "Bekor qilindi",
                    "at": obj.updated_at.isoformat() if obj.updated_at else None,
                }
            )
        if obj.status == Booking.Status.REJECTED:
            history.append(
                {
                    "key": "rejected",
                    "label": "Rad etildi",
                    "at": obj.updated_at.isoformat() if obj.updated_at else None,
                }
            )
        return [h for h in history if h.get("at")]


class BookingListSerializer(serializers.ModelSerializer):
    """Ro'yxat uchun yengil serializer — jarayon maydonlari faqat detailda."""

    lines = BookingLineSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(read_only=True)
    customer_avatar = serializers.SerializerMethodField()
    salon_name = serializers.SerializerMethodField()
    barber_name = serializers.CharField(source="barber.full_name", read_only=True)
    has_review = serializers.SerializerMethodField()
    review_id = serializers.SerializerMethodField()
    family_member = serializers.SerializerMethodField()
    booked_for_name = serializers.SerializerMethodField()
    order_number = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = (
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "customer_avatar",
            "salon",
            "salon_name",
            "barber",
            "barber_name",
            "start_at",
            "end_at",
            "started_at",
            "status",
            "total_price",
            "payment_method",
            "payment_status",
            "family_member",
            "booked_for_name",
            "order_number",
            "notes",
            "lines",
            "has_review",
            "review_id",
            "created_at",
        )
        read_only_fields = fields

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not bookings_has_order_number_column():
            self.fields.pop("order_number", None)
        if not bookings_has_notes_column():
            self.fields.pop("notes", None)

    def get_order_number(self, obj):
        return obj.order_number or f"MS-{obj.pk}"

    def get_customer_avatar(self, obj):
        cust = obj.customer
        if not cust or not cust.avatar:
            return ""
        request = self.context.get("request")
        url = cust.avatar.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_salon_name(self, obj):
        return obj.salon.name if obj.salon_id else None

    def get_has_review(self, obj):
        has, _ = booking_review_fields(obj)
        return has

    def get_review_id(self, obj):
        _, rid = booking_review_fields(obj)
        return rid

    def get_family_member(self, obj: Booking):
        if not bookings_has_family_member_column():
            return None
        return obj.family_member_id

    def get_booked_for_name(self, obj):
        if bookings_has_family_member_column() and obj.family_member_id and obj.family_member:
            return obj.family_member.name
        return (obj.customer.full_name or "").strip() or obj.customer.get_username()


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
    family_member_id = serializers.PrimaryKeyRelatedField(
        queryset=FamilyMember.objects.all(),
        source="family_member",
        required=False,
        allow_null=True,
    )
    payment_method = serializers.ChoiceField(
        choices=Booking.PaymentMethod.choices,
        default=Booking.PaymentMethod.CASH,
    )
    notes = serializers.CharField(
        max_length=500,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )

    def validate_payment_method(self, value):
        if value not in (Booking.PaymentMethod.CASH, Booking.PaymentMethod.ONLINE):
            raise serializers.ValidationError("To'lov turi: cash yoki online.")
        return value

    def validate_family_member(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if request and request.user.is_authenticated and value.user_id != request.user.id:
            raise serializers.ValidationError("Bu oila a'zosi sizga tegishli emas.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            phone = (getattr(request.user, "phone", None) or "").strip()
            if not phone:
                raise serializers.ValidationError(
                    {"detail": "Bron qilish uchun profilda telefon raqamini kiriting."}
                )

        barber = attrs["barber"]
        from barbers.readiness import barber_is_publicly_visible

        if not barber_is_publicly_visible(barber):
            raise serializers.ValidationError(
                {"barber": "Bu sartarosh hozircha mijozlarga ochiq emas."}
            )
        salon = attrs.get("salon", None)
        if request and request.user.is_authenticated:
            cust = request.user
            if isinstance(cust, User):
                cust_region = (getattr(cust, "region", None) or "").strip()
                if cust_region:
                    if (barber.region or "").strip() != cust_region:
                        raise serializers.ValidationError(
                            {
                                "detail": "Bu sartarosh siz tanlagan hudud uchun emas — bron qilish mumkin emas."
                            }
                        )
                    if salon is not None:
                        ob = getattr(salon, "owner_barber", None)
                        if ob is not None and (ob.region or "").strip() != cust_region:
                            raise serializers.ValidationError(
                                {
                                    "detail": "Bu salon sizning hududingiz uchun ro‘yxatdan o‘tmagan."
                                }
                            )

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

            services = get_salon_services_for_barber(salon, barber, service_ids)
            if len(services) != len(set(service_ids)):
                raise serializers.ValidationError(
                    "Invalid, inactive, duplicate, or barber-restricted services."
                )
        else:
            if not BarberProfile.objects.filter(barber=barber).exists():
                raise serializers.ValidationError({"barber": "Barber profile not found."})
            services = get_independent_services_for_barber(barber, barber_service_ids)
            if len(services) != len(set(barber_service_ids)):
                raise serializers.ValidationError("Invalid or duplicate barber services.")

        total_minutes = sum(s.duration_minutes for s in services)
        total_price = sum(s.price for s in services)
        end_at = start_at + timedelta(minutes=total_minutes)
        assert_booking_slot_available(
            barber=barber,
            services=services,
            start_at=start_at,
            salon=salon if is_salon_flow else None,
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
        )
        if blocking.exists():
            raise serializers.ValidationError("Selected time overlaps another booking.")

        attrs["_services"] = services
        attrs["_is_salon_flow"] = is_salon_flow
        attrs["_total_minutes"] = total_minutes
        attrs["_total_price"] = total_price
        attrs["_end_at"] = end_at

        payment_method = attrs.get("payment_method", Booking.PaymentMethod.CASH)
        if payment_method == Booking.PaymentMethod.ONLINE:
            request = self.context.get("request")
            if request and request.user.is_authenticated:
                from wallet.services.wallet_service import WalletService

                wallet = WalletService.ensure_wallet(request.user)
                if wallet.balance < Decimal(str(total_price)):
                    raise serializers.ValidationError(
                        {
                            "payment_method": "Hamyon balansi yetarli emas. Hamyonni to'ldiring yoki naqd tanlang.",
                            "required_amount": str(total_price),
                            "available_balance": str(wallet.balance),
                        }
                    )
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
        payment_method = validated_data.pop("payment_method", Booking.PaymentMethod.CASH)

        phone_snap = (getattr(customer, "phone", None) or "").strip()
        family_member = validated_data.pop("family_member", None)
        notes = (validated_data.pop("notes", "") or "").strip()

        create_kwargs = {
            "customer": customer,
            "salon": salon,
            "barber": barber,
            "start_at": start_at,
            "end_at": end_at,
            "status": Booking.Status.PENDING,
            "total_price": total_price,
            "customer_phone": phone_snap,
        }
        if bookings_has_family_member_column():
            create_kwargs["family_member"] = family_member
        if notes and bookings_has_notes_column():
            create_kwargs["notes"] = notes

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

            booking = booking_create_compat(**create_kwargs)
            if bookings_has_order_number_column():
                from bookings.checkin_tokens import assign_unique_order_number

                assign_unique_order_number(booking)
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
            if payment_method == Booking.PaymentMethod.ONLINE:
                from bookings.payments import apply_payment_on_create
                from wallet.services.wallet_service import WalletServiceError

                try:
                    apply_payment_on_create(booking=booking, payment_method=payment_method)
                except WalletServiceError as exc:
                    raise serializers.ValidationError({"payment_method": str(exc)}) from exc
            else:
                booking.payment_method = Booking.PaymentMethod.CASH
                booking.payment_status = Booking.PaymentStatus.NOT_APPLICABLE
                booking.save(update_fields=["payment_method", "payment_status", "updated_at"])
        return booking


class BookingCompletionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingCompletion
        fields = ("result_image", "portfolio_allowed", "actual_end_at", "completed_at")


class ReviewDimensionScoreSerializer(serializers.Serializer):
    target = serializers.ChoiceField(choices=["barber", "salon"])
    dimension = serializers.CharField(max_length=32)
    score = serializers.IntegerField(min_value=1, max_value=5)


class ReviewSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    dimensions = ReviewDimensionScoreSerializer(many=True, required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Migrate kechiksa (salon_rating ustuni / dimension jadvali yo'q) — 500 oldini olish.
        from bookings.db_compat import (
            reviews_has_dimension_table,
            reviews_has_salon_rating_column,
        )

        if not reviews_has_salon_rating_column():
            self.fields.pop("salon_rating", None)
            self.fields.pop("salon_text", None)
        if not reviews_has_dimension_table():
            self.fields.pop("dimensions", None)

    class Meta:
        model = Review
        fields = (
            "id",
            "booking",
            "author_name",
            "rating",
            "text",
            "salon_rating",
            "salon_text",
            "photo",
            "dimensions",
            "barber_reply",
            "barber_replied_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "author_name")

    def validate_booking(self, booking):
        user = self.context["request"].user
        if booking.customer_id != user.id:
            raise serializers.ValidationError("Not your booking.")
        if booking.status != Booking.Status.COMPLETED:
            raise serializers.ValidationError("Booking not completed.")
        if booking_has_review_for(booking.id):
            raise serializers.ValidationError("Already reviewed.")
        return booking

    def validate_dimensions(self, value):
        from bookings.survey import VALID_DIMENSIONS

        seen = set()
        for item in value:
            key = (item["target"], item["dimension"])
            if key not in VALID_DIMENSIONS:
                raise serializers.ValidationError(
                    f"Noma'lum o'lchov: {item['target']}/{item['dimension']}"
                )
            if key in seen:
                raise serializers.ValidationError(
                    f"O'lchov takrorlangan: {item['target']}/{item['dimension']}"
                )
            seen.add(key)
        return value

    def create(self, validated_data):
        from bookings.models import ReviewDimensionScore

        dimensions = validated_data.pop("dimensions", [])
        booking = validated_data["booking"]
        validated_data["author"] = self.context["request"].user
        validated_data["salon"] = booking.salon
        validated_data["barber"] = booking.barber
        review = super().create(validated_data)
        if dimensions:
            ReviewDimensionScore.objects.bulk_create(
                [
                    ReviewDimensionScore(
                        review=review,
                        target=item["target"],
                        dimension=item["dimension"],
                        score=item["score"],
                    )
                    for item in dimensions
                ]
            )
        return review
