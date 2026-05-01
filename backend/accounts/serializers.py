from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from barbers.models import Barber
from accounts.barber_signup_service import create_barber_with_flow

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
        # Keep serializer in charge of validation and delegate flow-specific creation.
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
