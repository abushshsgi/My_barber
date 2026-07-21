from django.contrib import admin

from wallet.models import GiftTransfer, LedgerEntry, ManualCardDeposit, Wallet, WalletCard


class WalletCardInline(admin.StackedInline):
    model = WalletCard
    extra = 0


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("wallet_number", "user", "balance", "created_at")
    search_fields = ("wallet_number", "user__phone", "user__full_name", "user__email")
    readonly_fields = ("wallet_number", "balance", "created_at", "updated_at")
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

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
