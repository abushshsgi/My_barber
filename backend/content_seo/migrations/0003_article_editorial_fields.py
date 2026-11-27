from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content_seo", "0002_seed_seo_article_drafts"),
    ]

    operations = [
        migrations.AddField(
            model_name="seoarticle",
            name="cover_alt",
            field=models.CharField(blank=True, default="", max_length=240),
        ),
        migrations.AddField(
            model_name="seoarticle",
            name="cover_width",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="seoarticle",
            name="cover_height",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="seoarticle",
            name="reviewed_by",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="seoarticle",
            name="sources",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="seoarticle",
            name="related_slugs",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
