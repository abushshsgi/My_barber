from django.utils import timezone
from rest_framework import serializers

from content_seo.models import SeoArticle


class SeoArticleCardSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.SerializerMethodField()
    published_locales = serializers.SerializerMethodField()
    reading_minutes = serializers.SerializerMethodField()

    class Meta:
        model = SeoArticle
        fields = (
            "slug",
            "locale",
            "category",
            "title",
            "excerpt",
            "cover_image_url",
            "cover_alt",
            "author",
            "published_at",
            "reading_minutes",
            "published_locales",
        )
        read_only_fields = fields

    def get_cover_image_url(self, obj: SeoArticle) -> str:
        return SeoArticleSerializer(obj, context=self.context).get_cover_image_url(obj)

    def get_published_locales(self, obj: SeoArticle) -> list[str]:
        return SeoArticleSerializer(obj, context=self.context).get_published_locales(obj)

    def get_reading_minutes(self, obj: SeoArticle) -> int:
        words = len((obj.content or "").split())
        if words <= 0:
            return 1
        return max(1, round(words / 180))


class SeoArticleSerializer(serializers.ModelSerializer):
    cover_image_url = serializers.SerializerMethodField()

    class Meta:
        model = SeoArticle
        fields = (
            "id",
            "slug",
            "locale",
            "category",
            "title",
            "seo_title",
            "meta_description",
            "excerpt",
            "content",
            "cover_image_url",
            "cover_alt",
            "cover_width",
            "cover_height",
            "author",
            "reviewed_by",
            "sources",
            "status",
            "related_morf_service",
            "related_style_ids",
            "related_slugs",
            "published_locales",
            "conversion_cta_href",
            "conversion_cta_label",
            "conversion_event",
            "published_at",
            "updated_at",
        )
        read_only_fields = fields

    published_locales = serializers.SerializerMethodField()

    def get_published_locales(self, obj: SeoArticle) -> list[str]:
        return list(
            SeoArticle.objects.filter(
                slug=obj.slug,
                status=SeoArticle.Status.PUBLISHED,
                published_at__isnull=False,
                published_at__lte=timezone.now(),
            )
            .order_by("locale")
            .values_list("locale", flat=True)
        )

    def get_cover_image_url(self, obj: SeoArticle) -> str:
        path = (obj.cover_image_path or "").strip()
        if not path:
            return ""
        if path.startswith("http://") or path.startswith("https://"):
            return path
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(path if path.startswith("/") else f"/{path}")
        return path