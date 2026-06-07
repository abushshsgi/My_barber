# Generated manually for wallet app

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Wallet",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("wallet_number", models.CharField(db_index=True, max_length=19, unique=True)),
                ("balance", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="wallet",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="WalletCard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("cardholder_name", models.CharField(max_length=255)),
                ("card_display", models.CharField(max_length=32)),
                ("issued_at", models.DateTimeField(auto_now_add=True)),
                (
                    "wallet",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="card",
                        to="wallet.wallet",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="LedgerEntry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "entry_type",
                    models.CharField(
                        choices=[
                            ("topup", "Top-up"),
                            ("gift_out", "Gift sent"),
                            ("gift_in", "Gift received"),
                            ("booking_pay", "Booking payment"),
                            ("refund", "Refund"),
                            ("adjustment", "Adjustment"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("balance_after", models.DecimalField(decimal_places=2, max_digits=14)),
                ("reference_type", models.CharField(blank=True, default="", max_length=64)),
                ("reference_id", models.CharField(blank=True, default="", max_length=64)),
                ("idempotency_key", models.CharField(db_index=True, max_length=128, unique=True)),
                ("prev_hash", models.CharField(max_length=64)),
                ("entry_hash", models.CharField(db_index=True, max_length=64)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "wallet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="ledger_entries",
                        to="wallet.wallet",
                    ),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="GiftTransfer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("message", models.TextField(blank=True, default="")),
                (
                    "status",
                    models.CharField(
                        choices=[("completed", "Completed"), ("failed", "Failed")],
                        db_index=True,
                        default="completed",
                        max_length=16,
                    ),
                ),
                ("idempotency_key", models.CharField(db_index=True, max_length=128, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "recipient_entry",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="gift_as_recipient",
                        to="wallet.ledgerentry",
                    ),
                ),
                (
                    "recipient_wallet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="gifts_received",
                        to="wallet.wallet",
                    ),
                ),
                (
                    "sender_entry",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="gift_as_sender",
                        to="wallet.ledgerentry",
                    ),
                ),
                (
                    "sender_wallet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="gifts_sent",
                        to="wallet.wallet",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="ledgerentry",
            index=models.Index(fields=["wallet", "created_at"], name="wallet_ledg_wallet__a1b2c3_idx"),
        ),
    ]
