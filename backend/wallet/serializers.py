from rest_framework import serializers

from wallet.gift_designs import get_gift_design
from wallet.models import GiftTransfer, LedgerEntry, Wallet, WalletCard
from wallet.services.wallet_service import MAX_GIFT_AMOUNT, MIN_GIFT_AMOUNT


class WalletCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletCard
        fields = ("cardholder_name", "card_display", "issued_at")


class WalletMeSerializer(serializers.ModelSerializer):
    card = WalletCardSerializer(read_only=True)

    class Meta:
        model = Wallet
        fields = ("wallet_number", "balance", "card", "created_at")


class LedgerEntrySerializer(serializers.ModelSerializer):
    kind = serializers.SerializerMethodField()

    class Meta:
        model = LedgerEntry
        fields = (
            "id",
            "entry_type",
            "kind",
            "amount",
            "balance_after",
            "reference_type",
            "reference_id",
            "entry_hash",
            "metadata",
            "created_at",
        )

    def get_kind(self, obj: LedgerEntry) -> str:
        return "in" if obj.amount >= 0 else "out"


class WalletTopUpSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=10000)


class GiftSendSerializer(serializers.Serializer):
    design_id = serializers.CharField(max_length=32)
    gift_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=MIN_GIFT_AMOUNT,
        max_value=MAX_GIFT_AMOUNT,
    )
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)
    recipient_user_id = serializers.IntegerField(required=False)
    recipient_phone = serializers.CharField(required=False, allow_blank=True)
    recipient_wallet_number = serializers.CharField(required=False, allow_blank=True)

    def validate_design_id(self, value: str) -> str:
        design = get_gift_design(value)
        if design is None:
            raise serializers.ValidationError("Noto'g'ri sovg'a karta dizayni.")
        return design.id

    def validate(self, attrs):
        has_id = attrs.get("recipient_user_id") is not None
        has_phone = bool((attrs.get("recipient_phone") or "").strip())
        has_wallet = bool((attrs.get("recipient_wallet_number") or "").strip())
        if sum([has_id, has_phone, has_wallet]) != 1:
            raise serializers.ValidationError(
                "Qabul qiluvchini bitta usul bilan ko'rsating: recipient_user_id, "
                "recipient_phone yoki recipient_wallet_number."
            )
        return attrs


class GiftTransferSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()
    recipient_wallet_number = serializers.CharField(
        source="recipient_wallet.wallet_number",
        read_only=True,
    )
    sender_wallet_number = serializers.CharField(
        source="sender_wallet.wallet_number",
        read_only=True,
    )
    gift_amount = serializers.DecimalField(
        source="amount", max_digits=14, decimal_places=2, read_only=True
    )
    design = serializers.SerializerMethodField()

    class Meta:
        model = GiftTransfer
        fields = (
            "id",
            "amount",
            "gift_amount",
            "design_id",
            "design",
            "design_fee",
            "total_charged",
            "message",
            "status",
            "sender_name",
            "sender_wallet_number",
            "recipient_name",
            "recipient_wallet_number",
            "created_at",
        )

    def get_recipient_name(self, obj: GiftTransfer) -> str:
        user = obj.recipient_wallet.user
        return (user.full_name or user.phone or str(user.pk)).strip()

    def get_sender_name(self, obj: GiftTransfer) -> str:
        user = obj.sender_wallet.user
        return (user.full_name or user.phone or str(user.pk)).strip()

    def get_design(self, obj: GiftTransfer) -> dict | None:
        design = get_gift_design(obj.design_id)
        if design is None:
            return None
        return {
            "id": design.id,
            "name": design.name,
            "name_uz": design.name_uz,
            "preview": design.preview,
        }


class WalletRecipientSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone = serializers.CharField(allow_null=True)
    wallet_number = serializers.CharField()
