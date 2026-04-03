from django.conf import settings as django_settings
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from barbers.models import BarberProfile
from salons.models import SalonMembership

from .models import BarberApplication, User
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
        # Allow Django staff/superuser to access admin panel even if DB role wasn't set.
        if getattr(obj, "is_superuser", False) or getattr(obj, "is_staff", False):
            return User.Role.ADMIN
        return obj.role


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    region = serializers.ChoiceField(choices=UzRegion.choices, required=True)

    class Meta:
        model = User
        fields = ("email", "phone", "full_name", "password", "region")

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        user = User(**validated_data)
        user.username = validated_data["email"]
        user.role = User.Role.USER
        user.set_password(pwd)
        user.save()
        return user


class BarberApplicationSerializer(serializers.ModelSerializer):
    applicant_email = serializers.EmailField(source="user.email", read_only=True)
    applicant_name = serializers.CharField(source="user.full_name", read_only=True)
    region_label = serializers.SerializerMethodField()

    class Meta:
        model = BarberApplication
        fields = (
            "id",
            "applicant_email",
            "applicant_name",
            "shop_name",
            "age",
            "region",
            "region_label",
            "address",
            "latitude",
            "longitude",
            "staff_count_at_signup",
            "status",
            "created_at",
        )
        read_only_fields = (
            "id",
            "status",
            "created_at",
            "applicant_email",
            "applicant_name",
            "region_label",
        )

    def get_region_label(self, obj: BarberApplication) -> str:
        if not obj.region:
            return ""
        return dict(UzRegion.choices).get(obj.region, obj.region)


class BarberSignupSerializer(serializers.Serializer):
    """
    Barber MVP: majburiy joylashuv va has_salon.
    has_salon=True: keyin salon qidiruv + join; has_salon=False: keyin salon yaratish.
    """

    email = serializers.EmailField()
    phone = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField()
    has_salon = serializers.BooleanField(required=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    shop_name = serializers.CharField(required=False, allow_blank=True, default="")
    age = serializers.IntegerField(required=False, min_value=14, max_value=120, default=25)
    region = serializers.ChoiceField(choices=UzRegion.choices, required=True)
    address = serializers.CharField(required=False, allow_blank=True)
    staff_count_at_signup = serializers.IntegerField(min_value=1, default=1)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def validate_phone(self, value):
        value = (value or "").strip()
        if not value:
            return ""
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon ro'yxatdan o'tgan.")
        return value

    def validate(self, attrs):
        lat = float(attrs["latitude"])
        lng = float(attrs["longitude"])
        if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
            raise serializers.ValidationError(
                {"detail": "latitude / longitude noto'g'ri diapazonda."}
            )
        return attrs

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        email = validated_data.pop("email")
        phone = validated_data.pop("phone", "") or None
        full_name = validated_data.pop("full_name")
        has_salon = validated_data.pop("has_salon")
        latitude = validated_data.pop("latitude")
        longitude = validated_data.pop("longitude")
        shop_name = (validated_data.pop("shop_name", "") or "").strip()
        age = validated_data.pop("age", 25)
        region = validated_data.pop("region")
        address = validated_data.pop("address", "") or ""
        staff_count = validated_data.pop("staff_count_at_signup", 1)

        if not shop_name:
            shop_name = (
                "Salon tanlash kutilmoqda"
                if has_salon
                else "Salon yaratilishi kutilmoqda"
            )

        app_status = BarberApplication.Status.APPROVED
        if not getattr(django_settings, "AUTO_APPROVE_BARBERS", True):
            app_status = BarberApplication.Status.PENDING

        user = User(
            email=email,
            username=email,
            phone=phone,
            full_name=full_name,
            role=User.Role.BARBER_OWNER,
            region=region,
        )
        user.set_password(pwd)
        user.save()
        BarberApplication.objects.create(
            user=user,
            shop_name=shop_name,
            age=age,
            region=region,
            address=address,
            latitude=latitude,
            longitude=longitude,
            staff_count_at_signup=staff_count,
            status=app_status,
        )
        BarberProfile.objects.update_or_create(
            user=user,
            defaults={
                "latitude": latitude,
                "longitude": longitude,
                "location_text": address,
            },
        )
        return user

    def to_representation(self, instance):
        """CreateAPIView success response: instance is User, not input payload fields."""
        if isinstance(instance, User):
            return UserSerializer(instance, context=self.context).data
        return super().to_representation(instance)


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.role == User.Role.BARBER_OWNER:
            try:
                app = user.barber_application
            except BarberApplication.DoesNotExist:
                raise serializers.ValidationError(
                    {"detail": "Barber application missing."}
                )
            auto = getattr(django_settings, "AUTO_APPROVE_BARBERS", True)
            if (
                not auto
                and app.status != BarberApplication.Status.APPROVED
            ):
                raise serializers.ValidationError(
                    {"detail": "Barber account is not approved by admin."}
                )
        if user.role == User.Role.BARBER_STAFF:
            # ACTIVE: ishlaydi; WORKER_ACCEPTED: salon egasi tasdiqlashini kutmoqda (kirish mumkin)
            staff_ok = SalonMembership.objects.filter(
                user=user,
                invite_state__in=[
                    SalonMembership.InviteState.ACTIVE,
                    SalonMembership.InviteState.WORKER_ACCEPTED,
                ],
            ).exists()
            if not staff_ok:
                raise serializers.ValidationError(
                    {"detail": "Salon a'zolig'i topilmadi."}
                )
        data["user"] = UserSerializer(user).data
        return data


class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "phone", "full_name", "avatar")
