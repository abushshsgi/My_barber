from django.db import migrations

from content_seo.phase1_articles import seed_phase1


def noop(apps, schema_editor):
    return None


class Migration(migrations.Migration):

    dependencies = [
        ("content_seo", "0004_phase1_article_copy"),
    ]

    operations = [
        migrations.RunPython(seed_phase1, noop),
    ]
