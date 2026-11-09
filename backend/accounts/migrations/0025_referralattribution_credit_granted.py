from django.db import migrations, models


def backfill_credit_granted(apps, schema_editor):
    """Eski takliflar: referral_credit bildirishnomasidagi referee_id bo'yicha belgilash."""
    ReferralAttribution = apps.get_model("accounts", "ReferralAttribution")
    Notification = apps.get_model("notifications", "Notification")
    referee_ids: list[int] = []
    for payload in Notification.objects.filter(type="referral_credit").values_list("payload", flat=True):
        if not isinstance(payload, dict):
            continue
        raw = payload.get("referee_id")
        try:
            referee_ids.append(int(raw))
        except (TypeError, ValueError):
            continue
    if not referee_ids:
        return
    chunk = 500
    for start in range(0, len(referee_ids), chunk):
        ReferralAttribution.objects.filter(referee_id__in=referee_ids[start : start + chunk]).update(
            credit_granted=True,
            status="rewarded",
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0024_disable_free_tryon"),
        ("notifications", "0004_userpushtoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="referralattribution",
            name="credit_granted",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Shu taklif uchun referrerga 1 ta Morf AI try-on krediti yozilgan.",
            ),
        ),
        migrations.RunPython(backfill_credit_granted, migrations.RunPython.noop),
    ]
