from django.db import migrations

from content_seo.phase1_articles import PHASE1, seed_phase1


def revert_phase1(apps, schema_editor):
    SeoArticle = apps.get_model("content_seo", "SeoArticle")
    SeoArticle.objects.filter(
        slug__in={row["slug"] for row in PHASE1},
        locale__in=["ru", "en"],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("content_seo", "0003_article_editorial_fields"),
    ]

    operations = [
        migrations.RunPython(seed_phase1, revert_phase1),
    ]
