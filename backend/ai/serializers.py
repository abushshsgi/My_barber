from rest_framework import serializers

from ai.age_groups import resolve_hairstyle_image_path
from ai.services.gemini_style import FACE_SHAPES, HAIR_TYPES

from .models import AiStyleHistoryEntry, Hairstyle, MorphAiLookShare


class HairstyleSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source="style_id", read_only=True)
    image_url = serializers.SerializerMethodField()
    gallery = serializers.SerializerMethodField()

    class Meta:
        model = Hairstyle
        fields = (
            "id",
            "slug",
            "audience",
            "category",
            "title",
            "title_uz",
            "face_shapes",
            "hair_length",
            "image_url",
            "gallery",
            "description_uz",
            "tags",
            "age_groups",
            "sort_order",
        )
        read_only_fields = fields

    def get_image_url(self, obj: Hairstyle) -> str:
        age_group = self.context.get("age_group")
        persona_id = self.context.get("persona_id")
        return resolve_hairstyle_image_path(
            image_path=obj.image_path,
            slug=obj.slug,
            audience=obj.audience,
            age_group=age_group,
            persona_id=persona_id,
        )

    def get_gallery(self, obj: Hairstyle) -> list[dict[str, str]]:
        persona_id = self.context.get("persona_id")
        if obj.audience != "men" or not persona_id:
            return []
        from ai.explore_personas import list_persona_style_gallery

        return list_persona_style_gallery(
            audience=obj.audience,
            persona_id=persona_id,
            slug=obj.slug,
        )


class AiStyleHistoryEntrySerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    scanned_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AiStyleHistoryEntry
        fields = (
            "id",
            "photo_url",
            "face_shape_key",
            "hair_type_key",
            "source",
            "scanned_at",
        )
        read_only_fields = fields

    def get_photo_url(self, obj: AiStyleHistoryEntry) -> str | None:
        if not obj.photo:
            return None
        request = self.context.get("request")
        url = obj.photo.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class AiStyleHistoryCreateSerializer(serializers.Serializer):
    image = serializers.CharField(required=False, allow_blank=True)
    face_shape_key = serializers.CharField(required=False, allow_blank=True, default="")
    hair_type_key = serializers.CharField(required=False, allow_blank=True, default="")
    source = serializers.ChoiceField(choices=AiStyleHistoryEntry.Source.choices)
    replace_latest = serializers.BooleanField(required=False, default=False)

    def validate_face_shape_key(self, value: str) -> str:
        value = (value or "").strip().lower()
        if value and value not in FACE_SHAPES:
            raise serializers.ValidationError("Noto'g'ri yuz shakli.")
        return value

    def validate_hair_type_key(self, value: str) -> str:
        value = (value or "").strip().lower()
        if value and value not in HAIR_TYPES:
            raise serializers.ValidationError("Noto'g'ri soch turi.")
        return value


class MorphAiLookShareCreateSerializer(serializers.Serializer):
    style_id = serializers.CharField(required=False, allow_blank=True, max_length=64, default="")
    title = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    before_image = serializers.CharField(required=False, allow_blank=True, default="")
    after_image = serializers.CharField(required=True)


class MorphAiLookShareSerializer(serializers.ModelSerializer):
    before_url = serializers.SerializerMethodField()
    after_url = serializers.SerializerMethodField()

    class Meta:
        model = MorphAiLookShare
        fields = (
            "id",
            "style_id",
            "title",
            "before_url",
            "after_url",
            "created_at",
        )
        read_only_fields = fields

    def get_before_url(self, obj: MorphAiLookShare) -> str | None:
        if not obj.before_photo:
            return None
        request = self.context.get("request")
        url = obj.before_photo.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url

    def get_after_url(self, obj: MorphAiLookShare) -> str | None:
        if not obj.after_photo:
            return None
        request = self.context.get("request")
        url = obj.after_photo.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url
