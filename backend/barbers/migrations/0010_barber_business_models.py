from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("barbers", "0009_barberservice_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="barberworkphoto",
            name="likes",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="barberworkphoto",
            name="service_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="barberworkphoto",
            name="title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.CreateModel(
            name="BarberExpense",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("rent", "Rent"),
                            ("supplies", "Supplies"),
                            ("marketing", "Marketing"),
                            ("utility", "Utility"),
                            ("salary", "Salary"),
                            ("other", "Other"),
                        ],
                        max_length=16,
                    ),
                ),
                ("description", models.CharField(max_length=255)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("spent_on", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "barber",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="expenses", to="barbers.barber"),
                ),
            ],
            options={"ordering": ["-spent_on", "-id"]},
        ),
        migrations.CreateModel(
            name="BarberGoal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("target", models.DecimalField(decimal_places=2, max_digits=12)),
                ("current", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("unit", models.CharField(default="ta", max_length=32)),
                ("deadline", models.DateField()),
                ("done", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "barber",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="goals", to="barbers.barber"),
                ),
            ],
            options={"ordering": ["done", "deadline", "-id"]},
        ),
        migrations.CreateModel(
            name="BarberInventoryItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                (
                    "category",
                    models.CharField(
                        choices=[("tool", "Tool"), ("product", "Product"), ("consumable", "Consumable")],
                        max_length=16,
                    ),
                ),
                ("stock", models.IntegerField(default=0)),
                ("min_stock", models.PositiveIntegerField(default=0)),
                ("unit", models.CharField(default="dona", max_length=32)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("supplier", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "barber",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="inventory_items",
                        to="barbers.barber",
                    ),
                ),
            ],
            options={"ordering": ["name", "id"]},
        ),
        migrations.CreateModel(
            name="BarberPromo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=64)),
                ("description", models.CharField(blank=True, default="", max_length=255)),
                ("discount_pct", models.PositiveSmallIntegerField(default=0)),
                ("uses", models.PositiveIntegerField(default=0)),
                ("max_uses", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("expires", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "barber",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="promos", to="barbers.barber"),
                ),
            ],
            options={"ordering": ["-created_at"], "unique_together": {("barber", "code")}},
        ),
        migrations.CreateModel(
            name="BarberSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("notifications_email", models.BooleanField(default=True)),
                ("notifications_push", models.BooleanField(default=True)),
                ("notifications_sms", models.BooleanField(default=False)),
                ("auto_accept", models.BooleanField(default=False)),
                (
                    "language",
                    models.CharField(
                        choices=[("uz", "Uzbek"), ("ru", "Russian"), ("en", "English")],
                        default="uz",
                        max_length=8,
                    ),
                ),
                (
                    "theme",
                    models.CharField(
                        choices=[("light", "Light"), ("dark", "Dark")],
                        default="light",
                        max_length=8,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "barber",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE, related_name="settings", to="barbers.barber"
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="BarberSupportTicket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("subject", models.CharField(max_length=255)),
                ("message", models.TextField()),
                (
                    "status",
                    models.CharField(
                        choices=[("open", "Open"), ("in_progress", "In progress"), ("closed", "Closed")],
                        default="open",
                        max_length=16,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "barber",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="barber_support_tickets",
                        to="barbers.barber",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BarberInventoryMovement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("delta", models.IntegerField()),
                ("note", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "item",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="movements",
                        to="barbers.barberinventoryitem",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
