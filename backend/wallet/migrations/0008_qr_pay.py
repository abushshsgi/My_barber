# Generated manually for QR pay

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0022_barber_business_kind"),
        ("control_panel", "0003_financetransaction_qr_pay"),
        ("wallet", "0007_gift_remediation"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="ledgerentry",
            name="entry_type",
            field=models.CharField(
                choices=[
                    ("topup", "Top-up"),
                    ("gift_out", "Gift sent"),
                    ("gift_in", "Gift received"),
                    ("gift_design_fee", "Gift card design fee"),
                    ("booking_pay", "Booking payment"),
                    ("subscription", "Subscription"),
                    ("refund", "Refund"),
                    ("adjustment", "Adjustment"),
                    ("qr_pay", "QR payment to barber"),
                ],
                db_index=True,
                max_length=32,
            ),
        ),
        migrations.CreateModel(
            name="BarberQrPayProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_code", models.CharField(db_index=True, max_length=32, unique=True)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "barber",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="qr_pay_profile",
                        to="barbers.barber",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="QrPaymentRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("note", models.CharField(blank=True, default="", max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("paid", "Paid"),
                            ("cancelled", "Cancelled"),
                            ("expired", "Expired"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("expires_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "barber",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="qr_payment_requests",
                        to="barbers.barber",
                    ),
                ),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="requests",
                        to="wallet.barberqrpayprofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="QrPayment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=14)),
                ("note", models.CharField(blank=True, default="", max_length=200)),
                (
                    "status",
                    models.CharField(
                        choices=[("completed", "Completed"), ("refunded", "Refunded")],
                        db_index=True,
                        default="completed",
                        max_length=16,
                    ),
                ),
                ("idempotency_key", models.CharField(db_index=True, max_length=128, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "barber",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="qr_payments",
                        to="barbers.barber",
                    ),
                ),
                (
                    "finance_transaction",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="qr_payments",
                        to="control_panel.financetransaction",
                    ),
                ),
                (
                    "ledger_entry",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="qr_payment",
                        to="wallet.ledgerentry",
                    ),
                ),
                (
                    "payer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="qr_payments_sent",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "payer_wallet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="qr_payments_sent",
                        to="wallet.wallet",
                    ),
                ),
                (
                    "request",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payments",
                        to="wallet.qrpaymentrequest",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["barber", "created_at"], name="wallet_qrpa_barber__idx"),
                    models.Index(fields=["payer", "created_at"], name="wallet_qrpa_payer__idx"),
                    models.Index(fields=["status", "created_at"], name="wallet_qrpa_status_idx"),
                ],
            },
        ),
    ]
