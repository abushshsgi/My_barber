"""Production / shared DB dagi mijoz, salon, barber va tarixni tozalash.

Katalog (Category, CatalogService, Amenity, Hairstyle) va AdminAccount saqlanadi.
Telefon raqamlarni bo'shatish uchun User/Barber accountlarni o'chiradi.
"""

from __future__ import annotations

from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


CONFIRM_TOKEN = "YES_WIPE_ALL"


class Command(BaseCommand):
    help = (
        "Barcha mijoz/barber accountlar, salonlar, booking/chat/wallet/AI history ni o'chiradi. "
        f"Tasdiq: --confirm {CONFIRM_TOKEN}"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            default="",
            help=f"O'chirish uchun aniq yozing: {CONFIRM_TOKEN}",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat sonlar — hech narsa o'chirilmaydi.",
        )
        parser.add_argument(
            "--wipe-admins",
            action="store_true",
            help="AdminAccount larni ham o'chiradi (odatiy: saqlanadi).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        confirm = (options["confirm"] or "").strip()
        wipe_admins = options["wipe_admins"]

        host = connection.settings_dict.get("HOST") or "?"
        name = connection.settings_dict.get("NAME") or "?"
        self.stdout.write(f"Database: {name} @ {host}")

        counts = self._counts(wipe_admins=wipe_admins)
        for label, n in counts.items():
            self.stdout.write(f"  {label}: {n}")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — hech narsa o'chirilmadi."))
            return

        if confirm != CONFIRM_TOKEN:
            raise CommandError(
                f"Haqiqiy o'chirish uchun: --confirm {CONFIRM_TOKEN} "
                "(avval --dry-run bilan ko'ring)."
            )

        deleted = self._wipe(wipe_admins=wipe_admins)
        self.stdout.write(self.style.SUCCESS(f"Tozalandi. O'chirilgan yozuvlar (approx): {deleted}"))
        self._try_clear_redis_otp()

        after = self._counts(wipe_admins=wipe_admins)
        for label, n in after.items():
            self.stdout.write(f"  after {label}: {n}")

    def _counts(self, *, wipe_admins: bool) -> dict[str, int]:
        from accounts.models import AdminAccount, User, UserSession
        from ai.models import AiGenerationUsage, AiStyleHistoryEntry
        from barbers.models import Barber
        from bookings.models import Booking
        from chat.models import Conversation
        from notifications.models import BarberPushToken, Notification, UserPushToken
        from salons.models import Salon
        from wallet.models import GiftTransfer, LedgerEntry, Wallet

        data = {
            "users": User.objects.count(),
            "user_sessions": UserSession.objects.count(),
            "barbers": Barber.objects.count(),
            "salons": Salon.objects.count(),
            "bookings": Booking.objects.count(),
            "conversations": Conversation.objects.count(),
            "notifications": Notification.objects.count(),
            "barber_push_tokens": BarberPushToken.objects.count(),
            "user_push_tokens": UserPushToken.objects.count(),
            "wallets": Wallet.objects.count(),
            "ledger_entries": LedgerEntry.objects.count(),
            "gift_transfers": GiftTransfer.objects.count(),
            "ai_history": AiStyleHistoryEntry.objects.count(),
            "ai_usage": AiGenerationUsage.objects.count(),
            "django_sessions": Session.objects.count(),
        }
        if wipe_admins:
            data["admin_accounts"] = AdminAccount.objects.count()
        else:
            data["admin_accounts_kept"] = AdminAccount.objects.count()
        return data

    @transaction.atomic
    def _wipe(self, *, wipe_admins: bool) -> int:
        from accounts.models import AdminAccount, User, UserSession
        from ai.models import AiGenerationUsage, AiStyleHistoryEntry
        from barbers.models import Barber
        from bookings.models import Booking
        from chat.models import Conversation
        from control_panel.models import (
            AuditLog,
            BroadcastCampaign,
            FinanceTransaction,
            Payout,
            SupportReply,
            SupportTicket,
        )
        from notifications.models import BarberPushToken, Notification, UserPushToken
        from salons.models import Salon
        from wallet.models import GiftTransfer, LedgerEntry, Wallet, WalletCard

        total = 0

        def zap(qs, label: str) -> None:
            nonlocal total
            n, _ = qs.delete()
            total += n
            self.stdout.write(f"  deleted {label}: {n}")

        # 1) sessions
        zap(Session.objects.all(), "django_sessions")
        zap(UserSession.objects.all(), "user_sessions")

        # 2) wallet PROTECT wall — QuerySet.delete bypasses LedgerEntry.delete()
        zap(GiftTransfer.objects.all(), "gift_transfers")
        zap(LedgerEntry.objects.all(), "ledger_entries")
        zap(WalletCard.objects.all(), "wallet_cards")
        zap(Wallet.objects.all(), "wallets")

        # 3) chat / notifications / control panel
        zap(Conversation.objects.all(), "conversations")
        zap(Notification.objects.all(), "notifications")
        zap(BarberPushToken.objects.all(), "barber_push_tokens")
        zap(UserPushToken.objects.all(), "user_push_tokens")
        zap(SupportReply.objects.all(), "support_replies")
        zap(SupportTicket.objects.all(), "support_tickets")
        zap(FinanceTransaction.objects.all(), "finance_transactions")
        zap(Payout.objects.all(), "payouts")
        zap(AuditLog.objects.all(), "audit_logs")
        zap(BroadcastCampaign.objects.all(), "broadcasts")

        # 4) bookings + AI user data
        zap(Booking.objects.all(), "bookings")
        zap(AiStyleHistoryEntry.objects.all(), "ai_history")
        zap(AiGenerationUsage.objects.all(), "ai_usage")

        # 5) tenant graph
        zap(Salon.objects.all(), "salons")
        zap(Barber.objects.all(), "barbers")
        zap(User.objects.all(), "users")

        if wipe_admins:
            zap(AdminAccount.objects.all(), "admin_accounts")

        return total

    def _try_clear_redis_otp(self) -> None:
        try:
            from django.core.cache import cache

            cache.clear()
            self.stdout.write(self.style.SUCCESS("Cache/OTP flush: cache.clear() OK"))
        except Exception as exc:  # noqa: BLE001
            self.stdout.write(self.style.WARNING(f"Cache flush o'tkazib yuborildi: {exc}"))
