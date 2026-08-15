from django.db import migrations
from django.utils import timezone


def expire_referral_trial_subscriptions(apps, schema_editor):
    UserSubscription = apps.get_model("subscriptions", "UserSubscription")
    now = timezone.now()
    UserSubscription.objects.filter(
        source="referral_trial",
        status="active",
    ).update(status="expired", ends_at=now)


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0002_fix_referral_trial_to_starter"),
    ]

    operations = [
        migrations.RunPython(expire_referral_trial_subscriptions, migrations.RunPython.noop),
        migrations.DeleteModel(name="ReferralTrialGrant"),
    ]
