import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0013_user_google_sub"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="referral_code",
            field=models.CharField(
                blank=True, db_index=True, max_length=12, null=True, unique=True
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="referred_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="referred_users",
                to="accounts.user",
            ),
        ),
        migrations.CreateModel(
            name="ReferralAttribution",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code_used", models.CharField(max_length=12)),
                (
                    "status",
                    models.CharField(
                        choices=[("attributed", "Attributed"), ("rewarded", "Rewarded")],
                        db_index=True,
                        default="attributed",
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "referee",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referral_source",
                        to="accounts.user",
                    ),
                ),
                (
                    "referrer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="referrals_made",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
