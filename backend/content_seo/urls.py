from django.urls import path

from content_seo.views import SeoArticleDetailView, SeoArticleListView

urlpatterns = [
    path("articles/", SeoArticleListView.as_view()),
    path("articles/<slug:slug>/", SeoArticleDetailView.as_view()),
]