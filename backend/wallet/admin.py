from django.contrib import admin

from django.contrib import messages

from wallet.models import GiftTransfer, LedgerEntry, ManualCardDeposit, Wallet, WalletCard
from wallet.services.card_deposit import CardDepositService
from wallet.services.wallet_service import WalletServiceError


class WalletCardInline(admin.StackedInline):
    model = WalletCard
    extra = 0


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = (
        "wallet_number",
        "user",
        "balance",
        "is_frozen",
        "frozen_by",
        "frozen_at",
        "created_at",
    )
    list_filter = ("is_frozen", "frozen_by")
    search_fields = (
        "wallet_number",
        "user__phone",
        "user__full_name",
        "user__email",
        "frozen_by_label",
    )
    readonly_fields = (
        "wallet_number",
        "balance",
        "is_frozen",
        "frozen_at",
        "frozen_by",
        "frozen_by_user_id",
        "frozen_by_admin_id",
        "frozen_by_label",
        "freeze_reason",
        "freeze_log",
        "created_at",
        "updated_at",
    )
    inlines = [WalletCardInline]


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "wallet", "entry_type", "amount", "balance_after", "created_at")
    list_filter = ("entry_type",)
    search_fields = ("idempotency_key", "entry_hash", "wallet__wallet_number")
    readonly_fields = (
        "id",
        "wallet",
        "entry_type",
        "amount",
        "balance_after",
        "reference_type",
        "reference_id",
        "idempotency_key",
        "prev_hash",
        "entry_hash",
        "metadata",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(GiftTransfer)
class GiftTransferAdmin(admin.ModelAdmin):
    list_display = ("id", "sender_wallet", "recipient_wallet", "amount", "status", "created_at")
    readonly_fields = ("id", "created_at")


@admin.register(ManualCardDeposit)
class ManualCardDepositAdmin(admin.ModelAdmin):
    list_display = (
        "transaction_ref",
        "user",
        "amount",
        "status",
        "merchant_ref",
        "claimed_at",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = (
        "transaction_ref",
        "merchant_ref",
        "user__phone",
        "user__full_name",
        "user__email",
        "wallet__wallet_number",
    )
    readonly_fields = (
        "id",
        "user",
        "wallet",
        "amount",
        "status",
        "transaction_ref",
        "merchant_ref",
        "receiving_card_number",
        "receiving_card_masked",
        "receiving_cardholder",
        "receiving_bank",
        "client_ip",
        "user_agent",
        "claimed_at",
        "receipt_image",
        "reviewed_at",
        "reviewed_by_admin_id",
        "reviewed_by_admin_email",
        "review_note",
        "ledger_entry",
        "idempotency_key",
        "expires_at",
        "created_at",
        "updated_at",
    )

    actions = ("approve_with_receipt", "reject_deposit")

    @admin.action(description="Chek borlarini tasdiqlash va balansga yozish")
    def approve_with_receipt(self, request, queryset):
        ok = 0
        for deposit in queryset:
            try:
                CardDepositService.approve_deposit(
                    deposit_id=str(deposit.pk),
                    admin_id=getattr(request.user, "pk", None),
                    admin_email=getattr(request.user, "email", "") or "",
                    note="Django admin tasdiqladi",
                )
                ok += 1
            except WalletServiceError as exc:
                messages.error(request, f"{deposit.transaction_ref}: {exc}")
        if ok:
            messages.success(request, f"{ok} ta so'rov tasdiqlandi.")

    @admin.action(description="So'rovni rad etish")
    def reject_deposit(self, request, queryset):
        ok = 0
        for deposit in queryset:
            try:
                CardDepositService.reject_deposit(
                    deposit_id=str(deposit.pk),
                    admin_id=getattr(request.user, "pk", None),
                    admin_email=getattr(request.user, "email", "") or "",
                    note="Django admin rad etdi",
                )
                ok += 1
            except WalletServiceError as exc:
                messages.error(request, f"{deposit.transaction_ref}: {exc}")
        if ok:
            messages.success(request, f"{ok} ta so'rov rad etildi.")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
