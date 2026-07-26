"""Agent orqali tanlangan salonlarga 21 kunlik partner trial berish."""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from agents.models import FieldAgent
from barbers.models import PartnerTrialGrant
from barbers.partner_trial import PartnerTrialError, grant_partner_agent_trial
from salons.models import Salon


DEFAULT_SALON_IDS = (361, 362, 380)  # Make me Beautiful, Maxtob, Jalolbek Barber
DEFAULT_AGENT_CODE = "TN8GA4VQ"  # Abdurahim


class Command(BaseCommand):
    help = "Berilgan salon egalariga agent orqali bir martalik 21 kunlik trial beradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--agent-code",
            default=DEFAULT_AGENT_CODE,
            help="Field agent kodi (default: Abdurahim)",
        )
        parser.add_argument(
            "--salon-ids",
            nargs="*",
            type=int,
            default=list(DEFAULT_SALON_IDS),
            help="Salon ID lar",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Yozmasdan ko'rsatish",
        )

    def handle(self, *args, **options):
        code = str(options["agent_code"] or "").strip().upper()
        agent = FieldAgent.objects.filter(code=code, is_active=True).first()
        if agent is None:
            raise CommandError(f"Agent topilmadi yoki faol emas: {code}")

        salon_ids = options["salon_ids"] or list(DEFAULT_SALON_IDS)
        dry = bool(options["dry_run"])
        ok = 0
        skipped = 0
        failed = 0

        for sid in salon_ids:
            salon = Salon.objects.select_related("owner_barber").filter(pk=sid).first()
            if salon is None:
                self.stderr.write(self.style.ERROR(f"salon#{sid}: topilmadi"))
                failed += 1
                continue
            owner = salon.owner_barber
            if owner is None:
                self.stderr.write(self.style.ERROR(f"salon#{sid} {salon.name}: egasi yo'q"))
                failed += 1
                continue

            self.stdout.write(
                f"salon#{sid} {salon.name!r} → owner#{owner.pk} {owner.email} via {agent.code}"
            )
            if dry:
                skipped += 1
                continue

            # Agent attribution
            if not owner.referred_by_agent_id:
                type(owner).objects.filter(pk=owner.pk, referred_by_agent__isnull=True).update(
                    referred_by_agent=agent
                )
                owner.referred_by_agent = agent

            try:
                grant = grant_partner_agent_trial(
                    barber=owner,
                    agent=agent,
                    salon=salon,
                    source=PartnerTrialGrant.Source.ADMIN,
                    code_used=agent.code,
                    credit_advance=True,
                )
            except PartnerTrialError as exc:
                self.stderr.write(
                    self.style.WARNING(f"  skip: {exc.detail} ({exc.code})")
                )
                skipped += 1
                continue

            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK trial → {grant.ends_at.isoformat()} sub={grant.shop_subscription_id}"
                )
            )
            ok += 1

        self.stdout.write(
            self.style.NOTICE(f"Done: ok={ok} skipped={skipped} failed={failed} dry_run={dry}")
        )
