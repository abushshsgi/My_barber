from django.utils import timezone
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ai.views import UnthrottledAPIView
from content_seo.models import SeoArticle
from content_seo.serializers import SeoArticleSerializer


class SeoArticleListView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = SeoArticle.objects.filter(status=SeoArticle.Status.PUBLISHED).filter(
            published_at__isnull=False,
            published_at__lte=timezone.now(),
        )
        locale = (request.query_params.get("locale") or "uz").strip()
        if locale:
            qs = qs.filter(locale=locale)
        qs = qs.order_by("-published_at", "-updated_at")[:200]
        data = SeoArticleSerializer(qs, many=True, context={"request": request}).data
        return Response(data)


class SeoArticleDetailView(UnthrottledAPIView):
    permission_classes = [AllowAny]

    def get(self, request, slug: str):
        locale = (request.query_params.get("locale") or "uz").strip()
        try:
            article = SeoArticle.objects.get(
                slug=slug,
                locale=locale,
                status=SeoArticle.Status.PUBLISHED,
                published_at__isnull=False,
                published_at__lte=timezone.now(),
            )
        except SeoArticle.DoesNotExist as exc:
            raise NotFound() from exc
        data = SeoArticleSerializer(article, context={"request": request}).data
        return Response(data)