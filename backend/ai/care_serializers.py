from __future__ import annotations

from rest_framework import serializers

from ai.models import CareProduct, HairCareProfile
from ai.serializers import _media_absolute_url
from ai.services.care_match import parse_ingredients_text


HAIR_TAGS = frozenset(
    {
        "oily",
        "dry",
        "normal",
        "damaged",
        "straight",
        "wavy",
        "curly",
        "natural",
        "colored",
        "bleached",
    }
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


def _clean_tags(raw) -> list[str]:
    if isinstance(raw, str):
        raw = [part.strip() for part in raw.replace(";", ",").split(",")]
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        tag = str(item or "").strip().lower()
        if tag in HAIR_TAGS and tag not in out:
            out.append(tag)
    return out


class CareProductSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

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
            "pros_uz",
            "cons_uz",
            "warnings_uz",
            "is_published",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "image_url", "created_at", "updated_at")

    def get_image_url(self, obj: CareProduct) -> str | None:
        request = self.context.get("request")
        return _media_absolute_url(request, obj.image)

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

    def update(self, instance: HairCareProfile, validated_data: dict) -> HairCareProfile:
        from django.utils import timezone

        for key, value in validated_data.items():
            setattr(instance, key, value)
        if instance.condition and instance.texture and instance.color_status and not instance.completed_at:
            instance.completed_at = timezone.now()
        instance.save()
        return instance
