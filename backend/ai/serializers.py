from rest_framework import serializers

from ai.age_groups import resolve_hairstyle_image_path
from ai.services.gemini_style import FACE_SHAPES, HAIR_TYPES

from .models import AiStyleHistoryEntry, Hairstyle, MorphAiGenerationEntry, MorphAiLookShare


def _media_absolute_url(request, field) -> str | None:
    if not field:
        return None
    from media_store.utils import media_field_exists

    if not media_field_exists(field):
        return None
    url = field.url
    if request is not None:
        return request.build_absolute_uri(url)
    return url


def _user_display_name(user) -> str:
    if user is None:
        return ""
    name = (getattr(user, "full_name", None) or "").strip()
    if name:
        return name
    phone = (getattr(user, "phone", None) or "").strip()
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) >= 4:
        return f"Mijoz ···{digits[-4:]}"
    return "Mijoz"


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
        if self.context.get("skip_gallery"):
            return []
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
        from media_store.utils import media_field_exists

        if not media_field_exists(obj.photo):
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
    share_page_url = serializers.SerializerMethodField()
    sharer_name = serializers.SerializerMethodField()

    class Meta:
        model = MorphAiLookShare
        fields = (
            "id",
            "style_id",
            "title",
            "before_url",
            "after_url",
            "share_page_url",
            "sharer_name",
            "created_at",
        )
        read_only_fields = fields

    def get_before_url(self, obj: MorphAiLookShare) -> str | None:
        return _media_absolute_url(self.context.get("request"), obj.before_photo)

    def get_after_url(self, obj: MorphAiLookShare) -> str | None:
        return _media_absolute_url(self.context.get("request"), obj.after_photo)

    def get_share_page_url(self, obj: MorphAiLookShare) -> str:
        from accounts.referral import user_app_public_base

        return f"{user_app_public_base()}/morf-ai/share/{obj.pk}"

    def get_sharer_name(self, obj: MorphAiLookShare) -> str:
        return _user_display_name(obj.created_by)


class MorphAiGenerationCreateSerializer(serializers.Serializer):
    style_id = serializers.CharField(required=False, allow_blank=True, max_length=64, default="")
    title = serializers.CharField(required=False, allow_blank=True, max_length=160, default="")
    persona_id = serializers.CharField(required=False, allow_blank=True, max_length=64, default="")
    before_image = serializers.CharField(required=False, allow_blank=True, default="")
    after_image = serializers.CharField(required=True)


class MorphAiGenerationSerializer(serializers.ModelSerializer):
    before_url = serializers.SerializerMethodField()
    after_url = serializers.SerializerMethodField()

    class Meta:
        model = MorphAiGenerationEntry
        fields = (
            "id",
            "style_id",
            "title",
            "persona_id",
            "before_url",
            "after_url",
            "created_at",
        )
        read_only_fields = fields

    def get_before_url(self, obj: MorphAiGenerationEntry) -> str | None:
        return _media_absolute_url(self.context.get("request"), obj.before_photo)

    def get_after_url(self, obj: MorphAiGenerationEntry) -> str | None:
        return _media_absolute_url(self.context.get("request"), obj.after_photo)
