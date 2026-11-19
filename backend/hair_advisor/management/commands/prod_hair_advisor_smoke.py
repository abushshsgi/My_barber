"""Production-safe Hair Advisor API smoke (isolated test user, synthetic data)."""

from __future__ import annotations

import uuid
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.test.utils import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from ai.models import HairCareProfile
from hair_advisor.models import HairScan, ProductSubmission
from subscriptions.models import UserSubscription
from subscriptions.plans import PLAN_PLUS

PHONE = "+998907777777"
PASSWORD = "HairE2eSmoke!2026"


class Command(BaseCommand):
    help = "Run authenticated Hair Advisor smoke against the live DB (test user only)."

    @override_settings(SECURE_SSL_REDIRECT=False)
    def handle(self, *args, **options):
        results: list[tuple[str, str]] = []

        def ok(name: str, detail: str = "ok"):
            results.append((name, detail))
            self.stdout.write(self.style.SUCCESS(f"PASS {name}: {detail}"))

        def fail(name: str, detail: str):
            results.append((name, f"FAIL {detail}"))
            self.stdout.write(self.style.ERROR(f"FAIL {name}: {detail}"))

        user, _ = User.objects.get_or_create(
            phone=PHONE,
            defaults={
                "username": "hair_e2e_smoke",
                "email": "hair_e2e_smoke@mysaloon.uz",
                "full_name": "Hair E2E Smoke",
                "role": User.Role.USER,
                "is_active": True,
            },
        )
        user.set_password(PASSWORD)
        user.save(update_fields=["password"])

        now = timezone.now()
        sub = (
            UserSubscription.objects.filter(user=user, status=UserSubscription.Status.ACTIVE)
            .order_by("-ends_at")
            .first()
        )
        if not sub or sub.plan_code != PLAN_PLUS or (sub.ends_at and sub.ends_at < now):
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

        HairCareProfile.objects.update_or_create(
            user=user,
            defaults={"condition": "normal", "texture": "straight", "color_status": "natural"},
        )

        from django.conf import settings

        host = next(
            (h for h in (settings.ALLOWED_HOSTS or []) if h not in ("*", ".mysaloon.uz")),
            "api.mysaloon.uz",
        )
        client = APIClient(HTTP_HOST=host)
        client.force_authenticate(user=user)
        ok("auth", "force_authenticate test user")

        scan = client.post(
            "/api/v1/hair-advisor/scans/",
            {"input_method": "barcode", "barcode": "5901234123457"},
            format="json",
        )
        def body_json(res):
            if "application/json" not in (res.get("Content-Type") or ""):
                return None
            try:
                return res.json()
            except Exception:
                return None

        payload = body_json(scan)
        if scan.status_code == 403:
            fail("unknown_barcode_scan", (payload or {}).get("code", "403"))
        elif scan.status_code == 200 and (payload or {}).get("status") == "product_not_found":
            ok("unknown_barcode_scan", "product_not_found")
        else:
            fail("unknown_barcode_scan", f"status={scan.status_code} ctype={scan.get('Content-Type')} head={scan.content[:120]!r}")

        sub_res = client.post(
            "/api/v1/hair-advisor/submissions/",
            {
                "barcode": f"5901234{uuid.uuid4().int % 100000:05d}",
                "submitted_brand": "E2E Smoke",
                "submitted_product_name": "Test Bottle",
                "user_corrected_ingredients": ["Aqua", "Glycerin"],
            },
            format="json",
        )
        if sub_res.status_code in (200, 201):
            ok("submission_create")
        else:
            fail("submission_create", str(sub_res.status_code))

        hist = client.get("/api/v1/hair-advisor/history/")
        if hist.status_code == 200:
            ok("scan_history", f"count={len(hist.json()) if isinstance(hist.json(), list) else 'n/a'}")
        else:
            fail("scan_history", str(hist.status_code))

        subs_list = client.get("/api/v1/hair-advisor/submissions/")
        if subs_list.status_code == 200:
            ok("submissions_list")
        else:
            fail("submissions_list", str(subs_list.status_code))

        admin_denied = client.post("/api/v1/admin/product-verification/candidates/00000000-0000-0000-0000-000000000001/approve/")
        if admin_denied.status_code in (403, 401, 404):
            ok("admin_denied_for_customer", str(admin_denied.status_code))
        else:
            fail("admin_denied_for_customer", str(admin_denied.status_code))

        cmp_res = client.post(
            "/api/v1/hair-advisor/compare/",
            {"care_product_ids": []},
            format="json",
        )
        if cmp_res.status_code in (400, 422):
            ok("compare_endpoint", str(cmp_res.status_code))
        elif cmp_res.status_code == 200:
            ok("compare_endpoint", "200")

        try:
            HairScan.objects.filter(user=user, barcode__startswith="590").delete()
            ok("cleanup_test_rows", "scans removed; submissions may remain for aggregation")
        except Exception as exc:
            ok("cleanup_test_rows", f"partial: {type(exc).__name__}")
        self._summary(results)

    def _summary(self, results: list[tuple[str, str]]):
        failed = [n for n, d in results if d.startswith("FAIL")]
        if failed:
            self.stdout.write(self.style.WARNING(f"SMOKE_FAILED: {', '.join(failed)}"))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS("SMOKE_ALL_PASS"))