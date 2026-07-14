from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from accounts.barber_signup_service import create_barber_with_flow
from accounts.phone_validation import resolve_barber_signup_contact, validate_uz_mobile_phone
from accounts.password_policy import validate_barber_password
from barbers.models import Barber
from salons.geo_join import assert_join_distance_ok
from salons.join_service import attach_worker_membership
from salons.models import Salon

from .models import User
from .email_utils import is_internal_email
from .name_validation import validate_display_name
from .phone_utils import normalize_phone_field
from .uz_regions import UzRegion
from geo.region_resolver import resolve_region_from_coords


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    has_password = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    display_email = serializers.SerializerMethodField()
    email_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "display_email",
            "email_verified",
            "phone",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "region",
            "birth_year",
            "age",
            "latitude",
            "longitude",
            "onboarding_completed",
            "avatar",
            "has_password",
            "date_joined",
        )
        read_only_fields = (
            "id",
            "role",
            "has_password",
            "date_joined",
            "age",
            "display_email",
            "email_verified",
        )

    def get_display_email(self, obj: User) -> str | None:
        if is_internal_email(obj.email):
            return None
        return obj.email

    def get_email_verified(self, obj: User) -> bool:
        if is_internal_email(obj.email):
            return False
        return obj.email_verified_at is not None

    def get_has_password(self, obj: User) -> bool:
        return obj.has_usable_password()

    def get_age(self, obj: User) -> int | None:
        if obj.birth_year is None:
            return None
        from datetime import date

        age = date.today().year - obj.birth_year
        if age < 10 or age > 120:
            return None
        return age

    def validate_region(self, value):
        value = (value or "").strip()
        if not value:
            return ""
        valid = {c[0] for c in UzRegion.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri viloyat.")
        return value

    def validate_birth_year(self, value):
        if value is None:
            return value
        from datetime import date

        year = date.today().year
        if value < 1940 or value > year:
            raise serializers.ValidationError(f"Tug'ilgan yil {1940}–{year} oralig'ida bo'lishi kerak.")
        if year - value < 10:
            raise serializers.ValidationError("Yosh kamida 10 bo'lishi kerak.")
        return value

    def _quantize_coord(self, value):
        if value is None:
            return value
        return Decimal(str(value)).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)

    def validate_latitude(self, value):
        return self._quantize_coord(value)

    def validate_longitude(self, value):
        return self._quantize_coord(value)

    def validate_full_name(self, value):
        exclude = self.instance.pk if self.instance is not None else None
        return validate_display_name(value, exclude_user_id=exclude)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if ("first_name" in attrs or "last_name" in attrs) and "full_name" not in attrs:
            inst = self.instance
            first = (
                attrs.get("first_name", getattr(inst, "first_name", "") if inst else "") or ""
            ).strip()
            last = (
                attrs.get("last_name", getattr(inst, "last_name", "") if inst else "") or ""
            ).strip()
            combined = f"{first} {last}".strip()
            if combined:
                exclude = inst.pk if inst is not None else None
                validate_display_name(combined, exclude_user_id=exclude)
        lat = attrs.get("latitude", getattr(self.instance, "latitude", None))
        lng = attrs.get("longitude", getattr(self.instance, "longitude", None))
        if (lat is None) ^ (lng is None):
            raise serializers.ValidationError(
                {"latitude": "latitude va longitude birga berilishi kerak."}
            )
        if attrs.get("onboarding_completed") is True:
            full_name = (
                attrs.get("full_name")
                if "full_name" in attrs
                else getattr(self.instance, "full_name", "")
            )
            first_name = (
                attrs.get("first_name")
                if "first_name" in attrs
                else getattr(self.instance, "first_name", "")
            )
            last_name = (
                attrs.get("last_name")
                if "last_name" in attrs
                else getattr(self.instance, "last_name", "")
            )
            birth_year = (
                attrs.get("birth_year")
                if "birth_year" in attrs
                else getattr(self.instance, "birth_year", None)
            )
            region = (
                attrs.get("region")
                if "region" in attrs
                else getattr(self.instance, "region", "")
            )
            has_name = bool((first_name or "").strip() and (last_name or "").strip()) or bool(
                (full_name or "").strip()
            )
            if not has_name:
                raise serializers.ValidationError(
                    {
                        "onboarding_completed": (
                            "Profil to'liq emas — ism va familiya talab qilinadi."
                        ),
                    }
                )
            if birth_year is None:
                raise serializers.ValidationError(
                    {
                        "onboarding_completed": "Profil to'liq emas — yosh talab qilinadi.",
                    }
                )
            if lat is None or lng is None:
                raise serializers.ValidationError(
                    {
                        "onboarding_completed": (
                            "Profil to'liq emas — joylashuv (GPS) talab qilinadi."
                        ),
                    }
                )
            # Viloyat tanlash shart emas: GPS dan avtomatik aniqlanadi (backend foydasi uchun).
            if not (region or "").strip():
                resolved = resolve_region_from_coords(float(lat), float(lng))
                if resolved.region_code:
                    attrs["region"] = resolved.region_code
        return attrs

    def _apply_name_fields(self, validated_data: dict, instance: User | None = None) -> dict:
        inst = instance
        if "full_name" in validated_data and "first_name" not in validated_data:
            full = (validated_data.get("full_name") or "").strip()
            parts = full.split(None, 1)
            validated_data["first_name"] = parts[0] if parts else ""
            validated_data["last_name"] = parts[1] if len(parts) > 1 else ""
            validated_data["full_name"] = full
        elif "first_name" in validated_data or "last_name" in validated_data:
            first = (validated_data.get("first_name", getattr(inst, "first_name", "") if inst else "") or "").strip()
            last = (validated_data.get("last_name", getattr(inst, "last_name", "") if inst else "") or "").strip()
            validated_data["first_name"] = first
            validated_data["last_name"] = last
            validated_data["full_name"] = f"{first} {last}".strip()
        return validated_data

    def create(self, validated_data):
        validated_data = self._apply_name_fields(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._apply_name_fields(validated_data, instance)
        user = super().update(instance, validated_data)
        if validated_data.get("onboarding_completed") is True:
            from accounts.address_sync import ensure_home_address_from_profile

            ensure_home_address_from_profile(user)
        return user

    def get_role(self, obj: User) -> str:
        if getattr(obj, "is_superuser", False) or getattr(obj, "is_staff", False):
            return "ADMIN"
        return obj.role

    def validate_phone(self, value):
        value = normalize_phone_field(value)
        if not value:
            return None
        qs = User.objects.filter(phone=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Bu telefon allaqachon mijozda ro'yxatdan o'tgan.")
        if Barber.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon sartarosh akkauntida band.")
        return value


class BarberSignupSerializer(serializers.Serializer):
    """
    Barber MVP: majburiy joylashuv va has_salon.
    has_salon=True: ishchi — keyin mavjud salonga qo‘shilish (join + GPS tekshiruvi).
    has_salon=False: salon egasi, MyBarber yoki mustaqil barber — keyingi qadamlar UI bo‘yicha.
    """

    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "min_length": "Parol kamida 8 belgidan iborat bo‘lishi kerak.",
        },
    )
    full_name = serializers.CharField()
    has_salon = serializers.BooleanField(required=False)
    latitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=9, decimal_places=6, required=False, allow_null=True
    )
    shop_name = serializers.CharField(required=False, allow_blank=True, default="")
    age = serializers.IntegerField(required=False, min_value=14, max_value=120, default=25)
    region = serializers.ChoiceField(
        choices=UzRegion.choices,
        required=False,
        allow_blank=True,
        default="",
        error_messages={"invalid_choice": "Viloyat noto‘g‘ri tanlangan."},
    )
    address = serializers.CharField(required=False, allow_blank=True)
    staff_count_at_signup = serializers.IntegerField(min_value=1, default=1)
    work_mode = serializers.ChoiceField(
        choices=Barber.WorkMode.choices,
        default=Barber.WorkMode.SALON,
        required=False,
    )
    onboarding_flow = serializers.ChoiceField(
        choices=Barber.OnboardingFlow.choices,
        required=False,
        allow_blank=True,
        default="",
    )

    def validate_password(self, value):
        err = validate_barber_password(value)
        if err:
            raise serializers.ValidationError(err)
        return value

    def validate_email(self, value):
        v = (value or "").strip().lower()
        if not v:
            return ""
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Bu email allaqachon mijoz sifatida ro'yxatdan o'tgan."
            )
        if Barber.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Bu email allaqachon sartarosh sifatida ro'yxatdan o'tgan."
            )
        return v

    def validate_phone(self, value):
        if not (value or "").strip():
            return ""
        normalized, err = validate_uz_mobile_phone(value)
        if err:
            raise serializers.ValidationError(err)
        assert normalized is not None
        if User.objects.filter(phone=normalized).exists():
            raise serializers.ValidationError(
                "Bu telefon raqam allaqachon mijozda ro'yxatdan o'tgan."
            )
        if Barber.objects.filter(phone=normalized).exists():
            raise serializers.ValidationError(
                "Bu telefon raqam boshqa sartaroshda ro'yxatdan o'tgan."
            )
        return normalized

    def validate(self, attrs):
        resolved_email, resolved_phone, contact_err = resolve_barber_signup_contact(
            attrs.get("email"),
            attrs.get("phone"),
        )
        if contact_err:
            raise serializers.ValidationError({"detail": contact_err})
        attrs["email"] = resolved_email
        attrs["phone"] = resolved_phone

        flow = (attrs.get("onboarding_flow") or "").strip()
        lat_raw = attrs.get("latitude")
        lng_raw = attrs.get("longitude")

        if flow:
            if flow == Barber.OnboardingFlow.INDEPENDENT:
                attrs["work_mode"] = Barber.WorkMode.INDEPENDENT
                attrs["has_salon"] = False
            else:
                attrs["work_mode"] = Barber.WorkMode.SALON
                if flow == Barber.OnboardingFlow.EMPLOYEE:
                    attrs["has_salon"] = True
                else:
                    attrs["has_salon"] = False
        elif attrs.get("has_salon") is None:
            raise serializers.ValidationError({"has_salon": "Majburiy maydon."})

        if lat_raw is not None and lng_raw is not None:
            lat = float(lat_raw)
            lng = float(lng_raw)
            if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
                raise serializers.ValidationError(
                    {"detail": "latitude / longitude noto'g'ri diapazonda."}
                )
        elif flow in (
            Barber.OnboardingFlow.EMPLOYEE,
        ) or (not flow and attrs.get("has_salon")):
            raise serializers.ValidationError(
                {"detail": "Employee ro'yxatdan o'tish uchun joylashuv majburiy."}
            )
        elif lat_raw is not None or lng_raw is not None:
            raise serializers.ValidationError(
                {"detail": "latitude va longitude birga berilishi kerak."}
            )
        else:
            attrs["latitude"] = None
            attrs["longitude"] = None

        wm = attrs.get("work_mode", Barber.WorkMode.SALON)
        if wm == Barber.WorkMode.INDEPENDENT and attrs.get("has_salon"):
            raise serializers.ValidationError(
                {
                    "detail": "Mustaqil barber uchun has_salon=false bo‘lishi kerak (salonga ishchi sifatida emas).",
                }
            )
        return attrs

    def create(self, validated_data):
        return create_barber_with_flow(validated_data)

    def to_representation(self, instance):
        if isinstance(instance, Barber):
            return {
                "id": instance.id,
                "email": instance.email,
                "full_name": instance.full_name,
                "phone": instance.phone,
                "role": "BARBER",
                "work_mode": instance.work_mode,
            }
        if isinstance(instance, User):
            return UserSerializer(instance, context=self.context).data
        return super().to_representation(instance)


class BarberRegisterJoinSalonSerializer(serializers.Serializer):
    """
    Employee onboarding: signup draft ma'lumotlari + salon tanlash + GPS.
    Bitta so‘rovda barber yaratiladi, 100 m tekshiriladi va ACTIVE membership bog‘lanadi.
    """

    email = serializers.EmailField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "min_length": "Parol kamida 8 belgidan iborat bo‘lishi kerak.",
        },
    )
    full_name = serializers.CharField()
    salon_id = serializers.IntegerField(min_value=1)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)

    def validate_password(self, value):
        err = validate_barber_password(value)
        if err:
            raise serializers.ValidationError(err)
        return value

    def validate_email(self, value):
        v = (value or "").strip().lower()
        if not v:
            return ""
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Bu email allaqachon mijoz sifatida ro'yxatdan o'tgan."
            )
        if Barber.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Bu email allaqachon sartarosh sifatida ro'yxatdan o'tgan."
            )
        return v

    def validate_phone(self, value):
        if not (value or "").strip():
            return ""
        normalized, err = validate_uz_mobile_phone(value)
        if err:
            raise serializers.ValidationError(err)
        assert normalized is not None
        if User.objects.filter(phone=normalized).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon mijozda ro'yxatdan o'tgan.")
        if Barber.objects.filter(phone=normalized).exists():
            raise serializers.ValidationError(
                "Bu telefon raqam boshqa sartaroshda ro'yxatdan o'tgan."
            )
        return normalized

    def validate(self, attrs):
        resolved_email, resolved_phone, contact_err = resolve_barber_signup_contact(
            attrs.get("email"),
            attrs.get("phone"),
        )
        if contact_err:
            raise serializers.ValidationError({"detail": contact_err})
        attrs["email"] = resolved_email
        attrs["phone"] = resolved_phone

        salon = get_object_or_404(
            Salon.objects.filter(is_published=True).select_related("owner_barber"),
            pk=int(attrs["salon_id"]),
        )
        lat = float(attrs["latitude"])
        lng = float(attrs["longitude"])
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
            raise serializers.ValidationError({"detail": "latitude / longitude noto'g'ri diapazonda."})
        assert_join_distance_ok(salon, lat, lng)
        attrs["_salon"] = salon
        return attrs

    def create(self, validated_data):
        salon = validated_data.pop("_salon")
        validated_data.pop("salon_id")
        lat_dec = validated_data.pop("latitude")
        lng_dec = validated_data.pop("longitude")
        lat_f = float(lat_dec)
        lng_f = float(lng_dec)

        email = validated_data.pop("email")
        password = validated_data.pop("password")
        full_name = validated_data.pop("full_name")
        phone = validated_data.pop("phone", "") or ""

        owner_region = ""
        ob = salon.owner_barber
        if ob is not None:
            owner_region = (ob.region or "").strip()

        payload = {
            "email": email,
            "password": password,
            "full_name": full_name,
            "phone": phone,
            "has_salon": True,
            "latitude": lat_dec,
            "longitude": lng_dec,
            "shop_name": (salon.name or "").strip() or "Salon",
            "address": (salon.address or "").strip(),
            "staff_count_at_signup": 1,
            "work_mode": Barber.WorkMode.SALON,
            "onboarding_flow": Barber.OnboardingFlow.EMPLOYEE,
            "region": owner_region,
            "age": 25,
        }

        with transaction.atomic():
            barber = create_barber_with_flow(payload)
            attach_worker_membership(barber, salon, lat_f, lng_f)

        return barber


class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "phone", "full_name", "avatar")
