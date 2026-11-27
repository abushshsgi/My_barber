"""Emit JWT JSON for Playwright (isolated QA DB only)."""
from __future__ import annotations

import json
import os

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from accounts.views_phone_auth import _auth_success_body


class Command(BaseCommand):
    help = "Stdout: {access, refresh, session_id?, user} for Playwright seeding."

    def handle(self, *args, **options):
        db_url = os.environ.get("DATABASE_URL", "")
        if "qa_verify_8001" not in db_url and os.environ.get("MYSALOON_QA_ISOLATED") != "1":
            raise CommandError("Refusing: set DATABASE_URL=qa_verify_8001 or MYSALOON_QA_ISOLATED=1")

        phone = "+998900000199"
        password = "PlaywrightIsolated1!"
        user, _ = User.objects.update_or_create(
            phone=phone,
            defaults={
                "username": "playwright_isolated",
                "email": "playwright_isolated@mysaloon.uz",
                "full_name": "Playwright Isolated",
                "role": User.Role.USER,
                "is_active": True,
                "password": make_password(password),
            },
        )
        body = _auth_success_body(user, is_new=False, request=None)
        self.stdout.write(json.dumps(body))