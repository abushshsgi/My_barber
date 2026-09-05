from __future__ import annotations

from rest_framework import serializers

from ai.models import CareProduct, CareShelfItem, HairCareProfile
from ai.serializers import _media_absolute_url
from ai.services.barcode_country import detect_country_from_barcode, normalize_barcode
from ai.services.care_match import (
    CONCERN_TAGS,
    HAIR_TAGS,
    SCALP_TAGS,
    parse_ingredients_text,
)


def _maybe_json_list(raw):
    import json

    if isinstance(raw, str):
        text = raw.strip()
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
        return [part.strip() for part in text.replace(";", ",").split(",") if part.strip()]
    return raw


def _clean_allowed(raw, allowed: frozenset[str]) -> list[str]:
    if isinstance(raw, str):
        raw = [part.strip() for part in raw.replace(";", ",").split(",")]
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        tag = str(item or "").strip().lower()
        if tag in allowed and tag not in out:
            out.append(tag)
    return out


def _clean_tags(raw) -> list[str]:
    return _clean_allowed(raw, HAIR_TAGS)


class CareProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    viewers_count = serializers.SerializerMethodField()
    clickers_count = serializers.SerializerMethodField()
    title = serializers.ReadOnlyField(source="name")
    ingredients_raw = serializers.ReadOnlyField(source="ingredients_text")
    usage_instructions = serializers.ReadOnlyField(source="usage_uz")
    target_hair_types = serializers.ReadOnlyField(source="suitable_for")
    target_scalp_types = serializers.ReadOnlyField(source="scalp_types")

    class Meta:
        model = CareProduct
        fields = (
            "id",
            "name",
            "title",
            "brand",
            "slug",
            "category",
            "audience",
            "barcode",
            "country_of_origin",
            "country_code_prefix",
            "is_verified",
            "image_url",
            "external_image_url",
            "ingredients_text",
            "ingredients_raw",
            "ingredients",
            "usage_uz",
            "usage_instructions",
            "purpose_uz",
            "suitable_for",
            "target_hair_types",
            "not_suitable_for",
            "scalp_types",
            "target_scalp_types",
            "concerns",
            "pros_uz",
            "cons_uz",
            "warnings_uz",
            "is_published",
            "views_count",
            "clicks_count",
            "viewers_count",
            "clickers_count",
            "sort_order",
            "likes_count",
            "liked_by_me",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "slug",
            "image_url",
            "likes_count",
            "liked_by_me",
            "views_count",
            "clicks_count",
            "viewers_count",
            "clickers_count",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "name": {"required": False},
            "barcode": {"required": False, "allow_null": True, "allow_blank": True},
            "external_image_url": {"required": False, "allow_blank": True},
        }

    def get_image_url(self, obj: CareProduct) -> str | None:
        request = self.context.get("request")
        file_url = _media_absolute_url(request, obj.image)
        if file_url:
            return file_url
        url = str(getattr(obj, "external_image_url", "") or "").strip()
        return url or None

    def get_likes_count(self, obj: CareProduct) -> int:
        annotated = getattr(obj, "likes_count", None)
        if annotated is not None:
            return int(annotated)
        return int(obj.likes.count())

    def get_liked_by_me(self, obj: CareProduct) -> bool:
        liked_ids = self.context.get("liked_product_ids")
        if isinstance(liked_ids, set):
            return obj.id in liked_ids
        request = self.context.get("request")
        if not request or not getattr(request.user, "is_authenticated", False):
            return False
        return obj.likes.filter(user_id=request.user.id).exists()

    def get_viewers_count(self, obj: CareProduct) -> int:
        annotated = getattr(obj, "viewers_count", None)
        if annotated is not None:
            return int(annotated)
        return int(obj.insights.filter(views__gt=0).count())

    def get_clickers_count(self, obj: CareProduct) -> int:
        annotated = getattr(obj, "clickers_count", None)
        if annotated is not None:
            return int(annotated)
        return int(obj.insights.filter(clicks__gt=0).count())

    def validate_category(self, value: str) -> str:
        value = (value or "").strip().lower()
        valid = {c[0] for c in CareProduct.Category.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri kategoriya.")
        return value

    def validate_sort_order(self, value) -> int:
        try:
            n = int(value)
        except (TypeError, ValueError):
            return 0
        return max(0, min(32767, n))

    def validate_is_published(self, value) -> bool:
        if isinstance(value, str):
            return value.strip().lower() in ("1", "true", "yes", "on")
        return bool(value)

    def validate_ingredients(self, value):
        import json

        if isinstance(value, str):
            text = value.strip()
            if text.startswith("["):
                try:
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        value = parsed
                    else:
                        value = parse_ingredients_text(text)
                except json.JSONDecodeError:
                    value = parse_ingredients_text(text)
            else:
                value = parse_ingredients_text(text)
        return value

    def validate_suitable_for(self, value) -> list[str]:
        return _clean_tags(_maybe_json_list(value))

    def validate_not_suitable_for(self, value) -> list[str]:
        return _clean_tags(_maybe_json_list(value))

    def validate_scalp_types(self, value) -> list[str]:
        return _clean_allowed(_maybe_json_list(value), SCALP_TAGS)

    def validate_concerns(self, value) -> list[str]:
        return _clean_allowed(_maybe_json_list(value), CONCERN_TAGS)

    def validate_barcode(self, value):
        digits = normalize_barcode(value)
        return digits or None

    def validate_is_verified(self, value) -> bool:
        if isinstance(value, str):
            return value.strip().lower() in ("1", "true", "yes", "on")
        return bool(value)

    def validate_external_image_url(self, value) -> str:
        return str(value or "").strip()

    def validate(self, attrs: dict) -> dict:
        raw = self.initial_data if hasattr(self, "initial_data") else {}
        if not str(attrs.get("name") or "").strip():
            title = ""
            if isinstance(raw, dict):
                title = str(raw.get("title") or "").strip()
            if title:
                attrs["name"] = title
        if isinstance(raw, dict) and not attrs.get("ingredients_text"):
            ingredients_raw = str(raw.get("ingredients_raw") or "").strip()
            if ingredients_raw:
                attrs["ingredients_text"] = ingredients_raw
        if isinstance(raw, dict) and not attrs.get("usage_uz"):
            usage = str(raw.get("usage_instructions") or "").strip()
            if usage:
                attrs["usage_uz"] = usage
        if isinstance(raw, dict) and not attrs.get("suitable_for"):
            hair = raw.get("target_hair_types")
            if hair not in (None, "", []):
                attrs["suitable_for"] = _clean_tags(_maybe_json_list(hair))
        if isinstance(raw, dict) and not attrs.get("scalp_types"):
            scalp = raw.get("target_scalp_types")
            if scalp not in (None, "", []):
                attrs["scalp_types"] = _clean_allowed(_maybe_json_list(scalp), SCALP_TAGS)
        if isinstance(raw, dict) and not attrs.get("external_image_url"):
            image_url = str(raw.get("image_url") or "").strip()
            if image_url.startswith("http"):
                attrs["external_image_url"] = image_url

        barcode = attrs.get("barcode")
        if barcode:
            detected = detect_country_from_barcode(str(barcode))
            if detected["is_matched"] and not str(attrs.get("country_of_origin") or "").strip():
                attrs["country_of_origin"] = detected["country_name"]
            if detected["is_matched"] and not str(attrs.get("country_code_prefix") or "").strip():
                attrs["country_code_prefix"] = detected["prefix"]

        text = attrs.get("ingredients_text")
        ingredients = attrs.get("ingredients")
        if text is not None and (not ingredients or ingredients == []):
            attrs["ingredients"] = parse_ingredients_text(str(text))
        elif isinstance(ingredients, list):
            attrs["ingredients"] = parse_ingredients_text(
                ", ".join(str(x) for x in ingredients if str(x).strip())
            )
            if not attrs.get("ingredients_text"):
                attrs["ingredients_text"] = ", ".join(attrs["ingredients"])
        return attrs


class HairCareProfileSerializer(serializers.ModelSerializer):
    complete = serializers.BooleanField(source="is_complete", read_only=True)

    class Meta:
        model = HairCareProfile
        fields = (
            "condition",
            "texture",
            "color_status",
            "scalp",
            "concerns",
            "complete",
            "completed_at",
            "updated_at",
        )
        read_only_fields = ("complete", "completed_at", "updated_at")

    def validate_condition(self, value: str) -> str:
        value = (value or "").strip().lower()
        valid = {c[0] for c in HairCareProfile.Condition.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri soch holati.")
        return value

    def validate_texture(self, value: str) -> str:
        value = (value or "").strip().lower()
        valid = {c[0] for c in HairCareProfile.Texture.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri tekstura.")
        return value

    def validate_color_status(self, value: str) -> str:
        value = (value or "").strip().lower()
        valid = {c[0] for c in HairCareProfile.ColorStatus.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri rang holati.")
        return value

    def validate_scalp(self, value: str) -> str:
        value = (value or "").strip().lower()
        if not value:
            return ""
        valid = {c[0] for c in HairCareProfile.Scalp.choices}
        if value not in valid:
            raise serializers.ValidationError("Noto'g'ri bosh terisi turi.")
        return value

    def validate_concerns(self, value) -> list[str]:
        return _clean_allowed(_maybe_json_list(value), CONCERN_TAGS)

    def update(self, instance: HairCareProfile, validated_data: dict) -> HairCareProfile:
        from django.utils import timezone

        for key, value in validated_data.items():
            setattr(instance, key, value)
        if instance.condition and instance.texture and instance.color_status and not instance.completed_at:
            instance.completed_at = timezone.now()
        instance.save()
        return instance


class CareShelfItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareShelfItem
        fields = (
            "id",
            "product",
            "name",
            "brand",
            "category",
            "volume_ml",
            "usage_frequency",
            "uses_per_day",
            "dose_ml_per_use",
            "opened_at",
            "pao_months",
            "ai_advice",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "uses_per_day", "dose_ml_per_use", "ai_advice", "created_at", "updated_at")

    def validate_name(self, value: str) -> str:
        s = str(value or "").strip()
        if len(s) < 2:
            raise serializers.ValidationError("Mahsulot nomini kiriting.")
        return s[:120]

    def validate_brand(self, value: str) -> str:
        return str(value or "").strip()[:80]

    def validate_category(self, value: str) -> str:
        value = (value or "").strip().lower()
        valid = {c[0] for c in CareShelfItem.Category.choices}
        if value not in valid:
            raise serializers.ValidationError("Kategoriya noto'g'ri.")
        return value

    def validate_volume_ml(self, value: int) -> int:
        n = int(value or 0)
        if n < 10 or n > 3000:
            raise serializers.ValidationError("Hajm 10ml dan 3000ml gacha bo'lishi kerak.")
        return n

    def validate_pao_months(self, value: int) -> int:
        n = int(value or 0)
        if n not in {3, 6, 12, 24}:
            raise serializers.ValidationError("PAO 3M/6M/12M/24M bo'lishi kerak.")
        return n


class CareShelfEstimateInputSerializer(serializers.Serializer):
    product_name = serializers.CharField(max_length=120)
    category = serializers.ChoiceField(choices=CareShelfItem.Category.choices, default=CareShelfItem.Category.HAIR)
    volume_ml = serializers.IntegerField(min_value=10, max_value=3000)
    usage_frequency = serializers.CharField(max_length=48)
    opened_at = serializers.DateField()
    pao_months = serializers.ChoiceField(choices=[3, 6, 12, 24], default=12)
    dose_ml_per_use = serializers.FloatField(min_value=0.1, max_value=30, required=False)
