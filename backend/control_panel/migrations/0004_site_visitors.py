from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0024_disable_free_tryon"),
        ("control_panel", "0003_financetransaction_qr_pay"),
    ]

    operations = [
        migrations.CreateModel(
            name="SiteVisitor",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("visitor_key", models.CharField(db_index=True, max_length=64, unique=True)),
                ("session_key", models.CharField(blank=True, default="", max_length=64)),
                ("first_path", models.CharField(blank=True, default="", max_length=300)),
                ("last_path", models.CharField(blank=True, default="", max_length=300)),
                ("referrer", models.CharField(blank=True, default="", max_length=500)),
                ("language", models.CharField(blank=True, default="", max_length=32)),
                ("user_agent", models.CharField(blank=True, default="", max_length=255)),
                ("device_label", models.CharField(blank=True, default="", max_length=64)),
                ("ip_address", models.CharField(blank=True, default="", max_length=64)),
                ("visit_count", models.PositiveIntegerField(default=0)),
                ("pageview_count", models.PositiveIntegerField(default=0)),
                ("click_count", models.PositiveIntegerField(default=0)),
                ("first_seen", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("last_seen", models.DateTimeField(auto_now=True, db_index=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="site_visits",
                        to="accounts.user",
                    ),
                ),
            ],
            options={"ordering": ["-last_seen"]},
        ),
        migrations.CreateModel(
            name="SiteVisitEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("page", "Page"), ("click", "Click")], db_index=True, max_length=16)),
                ("path", models.CharField(blank=True, default="", max_length=300)),
                ("label", models.CharField(blank=True, default="", max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "visitor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="control_panel.sitevisitor",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="sitevisitevent",
            index=models.Index(fields=["visitor", "-created_at"], name="site_evt_vis_created_idx"),
        ),
    ]
