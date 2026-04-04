"""Platform admin (AdminAccount) — Next.js admin panel uchun alohida jadval."""

from getpass import getpass

from django.core.management.base import BaseCommand, CommandError

from accounts.models import AdminAccount


class Command(BaseCommand):
    help = "Yangi AdminAccount yaratadi yoki mavjudini parolini yangilaydi (User jadvalidan mustaqil)."

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            nargs="?",
            default=None,
            help="Admin email (masalan admin@example.com)",
        )
        parser.add_argument(
            "--password",
            dest="password",
            default=None,
            help="Parol (ishlab chiqarishda ishlatmang; interaktiv yoki env tavsiya etiladi)",
        )

    def handle(self, *args, **options):
        email = (options.get("email") or "").strip().lower()
        if not email:
            email = (input("Email: ").strip() or "").lower()
        if not email:
            raise CommandError("Email kiritilishi kerak.")

        raw_pwd = options.get("password")
        if raw_pwd is None:
            p1 = getpass("Parol: ")
            p2 = getpass("Parol (qayta): ")
            if p1 != p2:
                raise CommandError("Parollar mos emas.")
            raw_pwd = p1
        if len(raw_pwd) < 8:
            raise CommandError("Parol kamida 8 belgi bo‘lishi kerak.")

        existing = AdminAccount.objects.filter(email__iexact=email).first()
        if existing:
            existing.set_password(raw_pwd)
            existing.is_active = True
            existing.save(update_fields=["password", "is_active"])
            self.stdout.write(self.style.SUCCESS(f"Yangilandi: {existing.email}"))
            return

        acc = AdminAccount(email=email, is_active=True)
        acc.set_password(raw_pwd)
        acc.save()
        self.stdout.write(self.style.SUCCESS(f"Yaratildi: {acc.email}"))
