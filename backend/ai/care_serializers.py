from __future__ import annotations

from rest_framework import serializers

from ai.models import CareProduct, HairCareProfile
from ai.serializers import _media_absolute_url
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

    class Meta:
        model = CareProduct
        fields = (
            "id",
            "name",
            "brand",
            "slug",
            "category",
            "image_url",
            "ingredients_text",
            "ingredients",
            "usage_uz",
            "purpose_uz",
            "suitable_for",
            "not_suitable_for",
            "scalp_types",
            "concerns",
            "pros_uz",
            "cons_uz",
            "warnings_uz",
            "is_published",
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
            "created_at",
            "updated_at",
        )

    def get_image_url(self, obj: CareProduct) -> str | None:
        request = self.context.get("request")
        return _media_absolute_url(request, obj.image)

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

    def validate(self, attrs: dict) -> dict:
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
