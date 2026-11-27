"""Isolated SQLite (8001) — Playwright JWT va published guide fixture."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from ai.models import HairCareProfile
from content_seo.models import SeoArticle
from subscriptions.models import UserSubscription
from subscriptions.plans import PLAN_PLUS


PLAYWRIGHT_PHONE = "+998900000199"
PLAYWRIGHT_PASSWORD = "PlaywrightIsolated1!"
QA_ARTICLE_SLUG = "qa-lighthouse-article"


class Command(BaseCommand):
    help = "Seed isolated QA DB with Playwright user and one published UZ article (no prod)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--teardown",
            action="store_true",
            help="Remove temporary QA article rows (published fixture only).",
        )

    def handle(self, *args, **options):
        db_url = os.environ.get("DATABASE_URL", "")
        if "qa_verify_8001" not in db_url and "playwright" not in db_url.lower():
            raise CommandError(
                "Refusing to seed: DATABASE_URL must target qa_verify_8001.sqlite3 (isolated QA)."
            )

        if options["teardown"]:
            deleted, _ = SeoArticle.objects.filter(slug=QA_ARTICLE_SLUG).delete()
            self.stdout.write(self.style.SUCCESS(f"Removed {deleted} temporary SEO article row(s)."))
            return

        user, created = User.objects.update_or_create(
            phone=PLAYWRIGHT_PHONE,
            defaults={
                "username": "playwright_isolated",
                "email": "playwright_isolated@mysaloon.uz",
                "full_name": "Playwright Isolated",
                "role": User.Role.USER,
                "is_active": True,
                "password": make_password(PLAYWRIGHT_PASSWORD),
            },
        )
        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Playwright user {action}: {PLAYWRIGHT_PHONE}"))

        HairCareProfile.objects.update_or_create(
            user=user,
            defaults={"condition": "normal", "texture": "straight", "color_status": "natural"},
        )

        now = datetime.now(timezone.utc)
        sub_active = UserSubscription.objects.filter(
            user=user,
            status=UserSubscription.Status.ACTIVE,
            plan_code=PLAN_PLUS,
        ).first()
        if not sub_active or (sub_active.ends_at and sub_active.ends_at < now):
            UserSubscription.objects.filter(user=user).update(status=UserSubscription.Status.EXPIRED)
            UserSubscription.objects.create(
                user=user,
                plan_code=PLAN_PLUS,
                status=UserSubscription.Status.ACTIVE,
                source=UserSubscription.Source.ADMIN,
                starts_at=now,
                ends_at=now + timedelta(days=30),
                price_uzs=0,
            )

        slug = QA_ARTICLE_SLUG
        body = (
            "Bu matn faqat mahalliy Lighthouse va serializer tekshiruvi uchun. "
            "Ishlab chiqarishda yashirin saqlanmaydi.\n\n"
            "Batafsil: [Textured Crop](/explore/men-textured-crop)."
        )
        article, a_created = SeoArticle.objects.update_or_create(
            slug=slug,
            locale=SeoArticle.Locale.UZ,
            defaults={
                "title": "QA: virtual try-on qo'llanmasi",
                "seo_title": "QA guide — Lighthouse",
                "meta_description": "Mahalliy Lighthouse uchun qisqa published fixture.",
                "excerpt": "Mahalliy Lighthouse fixture.",
                "content": body,
                "status": SeoArticle.Status.PUBLISHED,
                "published_at": now,
                "category": "guides",
            },
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Article {'created' if a_created else 'updated'}: /guides/{article.slug} (uz)"
            )
        )

        for locale, title in (
            (SeoArticle.Locale.RU, "QA: виртуальная примерка"),
            (SeoArticle.Locale.EN, "QA: virtual try-on guide"),
        ):
            SeoArticle.objects.update_or_create(
                slug=slug,
                locale=locale,
                defaults={
                    "title": title,
                    "seo_title": title,
                    "meta_description": "Local hreflang fixture — not for production.",
                    "excerpt": "QA hreflang fixture.",
                    "content": body,
                    "status": SeoArticle.Status.PUBLISHED,
                    "published_at": now,
                    "category": "guides",
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Hreflang fixture locales published for {slug}"))