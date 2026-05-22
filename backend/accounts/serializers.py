from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from accounts.barber_signup_service import create_barber_with_flow
from barbers.models import Barber
from salons.geo_join import assert_join_distance_ok
from salons.join_service import attach_worker_membership
from salons.models import Salon

from .models import User
from .uz_regions import UzRegion


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "phone",
            "full_name",
            "role",
            "region",
            "avatar",
            "date_joined",
        )
        read_only_fields = ("id", "role", "date_joined")

    def get_role(self, obj: User) -> str:
        if getattr(obj, "is_superuser", False) or getattr(obj, "is_staff", False):
            return "ADMIN"
        return obj.role

    def validate_phone(self, value):
        value = (value or "").strip()
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


class UserRegisterSerializer(serializers.ModelSerializer):
    """Model unique validator inglizcha xabar bermasligi uchun email/phone qo‘lda tekshiriladi."""

    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True, max_length=32)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "min_length": "Parol kamida 8 belgidan iborat bo‘lishi kerak.",
        },
    )
    region = serializers.ChoiceField(
        choices=UzRegion.choices,
        required=False,
        allow_blank=True,
        default="",
        error_messages={"invalid_choice": "Viloyat noto‘g‘ri tanlangan."},
    )

    class Meta:
        model = User
        fields = ("email", "phone", "full_name", "password", "region")

    def validate_email(self, value):
        v = (value or "").strip().lower()
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Bu email allaqachon mijoz sifatida ro'yxatdan o'tgan."
            )
        if Barber.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(
                "Bu email sartarosh akkauntida band. Mijoz va sartarosh bir xil email bilan ro'yxatdan o'ta olmaydi."
            )
        return v

    def validate_phone(self, value):
        value = (value or "").strip()
        if not value:
            return ""
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                "Bu telefon allaqachon mijozda ro'yxatdan o'tgan."
            )
        if Barber.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                "Bu telefon sartarosh akkauntida band."
            )
        return value

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        if not validated_data.get("phone"):
            validated_data["phone"] = None
        user = User(**validated_data)
        user.username = validated_data["email"]
        user.role = User.Role.USER
        user.set_password(pwd)
        user.save()
        return user


class BarberSignupSerializer(serializers.Serializer):
    """
    Barber MVP: majburiy joylashuv va has_salon.
    has_salon=True: ishchi — keyin mavjud salonga qo‘shilish (join + GPS tekshiruvi).
    has_salon=False: salon egasi, MyBarber yoki mustaqil barber — keyingi qadamlar UI bo‘yicha.
    """

    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        error_messages={
            "min_length": "Parol kamida 8 belgidan iborat bo‘lishi kerak.",
        },
    )
    full_name = serializers.CharField()
    has_salon = serializers.BooleanField(required=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
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

    def validate_email(self, value):
        v = (value or "").strip().lower()
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
        value = (value or "").strip()
        if not value:
            return ""
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon mijozda ro'yxatdan o'tgan.")
        if Barber.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon sartaroshda ro'yxatdan o'tgan.")
        return value

    def validate(self, attrs):
        lat = float(attrs["latitude"])
        lng = float(attrs["longitude"])
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
            raise serializers.ValidationError(
                {"detail": "latitude / longitude noto'g'ri diapazonda."}
            )
        wm = attrs.get("work_mode", Barber.WorkMode.SALON)
        flow = (attrs.get("onboarding_flow") or "").strip()
        if flow:
            # Derive work_mode / has_salon from onboarding_flow to keep it consistent.
            if flow == Barber.OnboardingFlow.INDEPENDENT:
                attrs["work_mode"] = Barber.WorkMode.INDEPENDENT
                attrs["has_salon"] = False
            else:
                attrs["work_mode"] = Barber.WorkMode.SALON
                if flow == Barber.OnboardingFlow.EMPLOYEE:
                    attrs["has_salon"] = True
                else:
                    attrs["has_salon"] = False
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

    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
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

    def validate_email(self, value):
        v = (value or "").strip().lower()
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
        value = (value or "").strip()
        if not value:
            return ""
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon mijozda ro'yxatdan o'tgan.")
        if Barber.objects.filter(phone=value).exists():
            raise serializers.ValidationError(
                "Bu telefon raqam allaqachon sartaroshda ro'yxatdan o'tgan."
            )
        return value

    def validate(self, attrs):
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


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        email = (attrs.get(self.username_field) or "").strip().lower()
        if email:
            has_user = User.objects.filter(email__iexact=email).exists()
            has_barber = Barber.objects.filter(email__iexact=email).exists()
            if has_barber and not has_user:
                raise AuthenticationFailed(
                    "Bu email sartarosh akkauntiga tegishli. Mijoz ilovasidan kirish mumkin emas — sartarosh ilovasidan kiring.",
                    code="barber_account",
                )
        data = super().validate(attrs)
        user = self.user
        if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
            raise serializers.ValidationError(
                {
                    "detail": "Admin akkauntlari uchun maxsus kirish (admin/auth/token) ishlatiladi.",
                }
            )
        data["user"] = UserSerializer(user).data
        return data


class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "phone", "full_name", "avatar")
