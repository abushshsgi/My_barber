"""Click/Payme DEBUG fake top-uplarni bekor qilish (havo pul).

Ledger o'chirilmaydi (immutable) — manfiy adjustment yoziladi.
Default: dry-run. Haqiqiy yozish: --apply
"""

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from wallet.models import LedgerEntry, Wallet
from wallet.services.wallet_service import InsufficientBalanceError, WalletService


FAKE_SOURCES = ("click_checkout", "payme_checkout")


class Command(BaseCommand):
    help = (
        "Bekor qiladi: Click/Payme client-confirm orqali tushgan soxta (havo) top-uplar. "
        "Faqat metadata.source=click_checkout|payme_checkout."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Haqiqatan adjustment yozadi (bo'lmasa faqat ko'rsatadi).",
        )

    def handle(self, *args, **options):
        apply = bool(options["apply"])
        qs = (
            LedgerEntry.objects.filter(entry_type=LedgerEntry.EntryType.TOPUP)
            .filter(
                Q(metadata__source="click_checkout")
                | Q(metadata__source="payme_checkout")
            )
            .select_related("wallet", "wallet__user")
            .order_by("created_at")
        )

        total_fake = Decimal("0")
        total_clawed = Decimal("0")
        total_unrecoverable = Decimal("0")
        wallets_touched = 0
        rows_done = 0
        rows_skip = 0

        self.stdout.write(f"Found {qs.count()} fake provider top-up entries.")
        if not apply:
            self.stdout.write(self.style.WARNING("DRY-RUN — --apply bilan yoziladi."))

        by_wallet: dict[int, list[LedgerEntry]] = {}
        for entry in qs:
            by_wallet.setdefault(entry.wallet_id, []).append(entry)

        for wallet_id, entries in by_wallet.items():
            with transaction.atomic():
                wallet = Wallet.objects.select_for_update().select_related("user").get(pk=wallet_id)
                user = wallet.user
                fake_sum = sum((e.amount for e in entries), Decimal("0"))
                total_fake += fake_sum

                already = LedgerEntry.objects.filter(
                    wallet=wallet,
                    entry_type=LedgerEntry.EntryType.ADJUSTMENT,
                    metadata__action="clawback_fake_provider_topup",
                ).exists()
                # Per-entry clawback with idempotency
                clawed_here = Decimal("0")
                unrec_here = Decimal("0")
                wrote = False

                for entry in entries:
                    idem = f"clawback-fake-{entry.pk}"[:128]
                    if LedgerEntry.objects.filter(idempotency_key=idem).exists():
                        rows_skip += 1
                        continue

                    # Floor at 0 — agar sarflangan bo'lsa qisman yoki 0
                    wallet.refresh_from_db()
                    want = entry.amount if entry.amount > 0 else Decimal("0")
                    can = min(want, wallet.balance)
                    leftover = want - can

                    self.stdout.write(
                        f"  user={user.pk} {user.phone or user.email} "
                        f"src={(entry.metadata or {}).get('source')} "
                        f"fake={want} claw={can} unrecoverable={leftover} "
                        f"bal={wallet.balance} ref={entry.idempotency_key[:40]}"
                    )

                    if not apply:
                        total_clawed += can
                        total_unrecoverable += leftover
                        rows_done += 1
                        continue

                    if can <= 0:
                        # Sarflangan — faqat audit marker (0 so'm adjustment yo'q)
                        # Metadata-only: skip ledger, count unrecoverable
                        total_unrecoverable += leftover
                        rows_skip += 1
                        continue

                    try:
                        WalletService.post_entry(
                            wallet=wallet,
                            entry_type=LedgerEntry.EntryType.ADJUSTMENT,
                            amount=-can,
                            idempotency_key=idem,
                            reference_type="clawback",
                            reference_id=str(entry.pk),
                            metadata={
                                "action": "clawback_fake_provider_topup",
                                "reason": "Click/Payme hali ulanmagan — soxta client confirm",
                                "original_entry_id": str(entry.pk),
                                "original_source": (entry.metadata or {}).get("source"),
                                "original_order_id": (entry.metadata or {}).get("order_id"),
                                "requested_amount": str(want),
                                "clawed_amount": str(can),
                                "unrecoverable_spent": str(leftover),
                            },
                        )
                    except InsufficientBalanceError as exc:
                        self.stderr.write(self.style.ERROR(f"    skip: {exc}"))
                        rows_skip += 1
                        continue

                    clawed_here += can
                    unrec_here += leftover
                    total_clawed += can
                    total_unrecoverable += leftover
                    rows_done += 1
                    wrote = True

                if wrote or (not apply and fake_sum):
                    wallets_touched += 1
                    wallet.refresh_from_db()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"wallet={wallet.wallet_number} user={user.pk} "
                            f"fake_total={fake_sum} clawed={clawed_here or 'dry'} "
                            f"new_balance={wallet.balance}"
                        )
                    )

        self.stdout.write("")
        self.stdout.write(
            f"SUMMARY apply={apply} wallets={wallets_touched} "
            f"entries_processed={rows_done} skipped={rows_skip} "
            f"fake_total={total_fake} clawed={total_clawed} "
            f"unrecoverable_spent={total_unrecoverable}"
        )
        if apply:
            self.stdout.write(self.style.SUCCESS("Clawback applied."))
        else:
            self.stdout.write(self.style.WARNING("Dry-run only. Qayta ishga tushiring: --apply"))
