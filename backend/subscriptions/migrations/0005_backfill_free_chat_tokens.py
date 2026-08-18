from django.db import migrations
from django.db.models import Sum


def backfill_free_chat_tokens(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    SubscriptionUsagePeriod = apps.get_model("subscriptions", "SubscriptionUsagePeriod")
    totals = (
        SubscriptionUsagePeriod.objects.values("user_id")
        .annotate(total=Sum("morph_chat_tokens_used"))
    )
    for row in totals:
        used = int(row.get("total") or 0)
        if used <= 0:
            continue
        User.objects.filter(pk=row["user_id"]).update(morph_chat_free_tokens_used=used)


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0004_morph_chat_tokens"),
        ("accounts", "0018_user_morph_chat_free_tokens"),
    ]

    operations = [
        migrations.RunPython(backfill_free_chat_tokens, migrations.RunPython.noop),
    ]
