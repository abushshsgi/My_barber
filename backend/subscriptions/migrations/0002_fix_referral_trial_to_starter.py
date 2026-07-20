"""Noto'g'ri Plus referal sinovlarni Starter ga tuzatish."""

from django.db import migrations


def forwards(apps, schema_editor):
    UserSubscription = apps.get_model("subscriptions", "UserSubscription")
    from subscriptions.plans import PLAN_STARTER, get_plan

    plan = get_plan(PLAN_STARTER)
    if not plan:
        return
    snap = {
        "plan_code": plan["code"],
        "morph_ai_monthly": plan["morph_ai_monthly"],
        "morph_studio_monthly": plan["morph_studio_monthly"],
        "family_members_max": plan["family_members_max"],
        "morph_care": plan["morph_care"],
        "badge": plan["badge"],
        "period_days": plan["period_days"],
    }

    qs = UserSubscription.objects.filter(
        source="referral_trial",
        status="active",
        plan_code="plus",
    )
    for sub in qs.iterator():
        sub.plan_code = PLAN_STARTER
        sub.entitlements = snap
        sub.notes = ((sub.notes or "") + "\n[fixed] referral trial plan plus→starter").strip()
        sub.save(update_fields=["plan_code", "entitlements", "notes", "updated_at"])


def backwards(apps, schema_editor):
    # Qaytarib Plus qilmaymiz — noto'g'ri grant edi.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("subscriptions", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
