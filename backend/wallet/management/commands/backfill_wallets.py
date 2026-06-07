from django.core.management.base import BaseCommand

from accounts.models import User
from wallet.services.wallet_service import WalletService


class Command(BaseCommand):
    help = "Create wallets for all USER role accounts without one."

    def handle(self, *args, **options):
        users = User.objects.filter(role=User.Role.USER).order_by("pk")
        created = 0
        skipped = 0
        for user in users:
            before = hasattr(user, "wallet") and user.wallet is not None
            try:
                user.refresh_from_db()
            except Exception:
                pass
            from wallet.models import Wallet

            if Wallet.objects.filter(user=user).exists():
                skipped += 1
                continue
            WalletService.ensure_wallet(user)
            created += 1
        self.stdout.write(
            self.style.SUCCESS(f"Done. created={created} skipped={skipped}")
        )
