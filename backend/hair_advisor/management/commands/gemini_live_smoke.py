"""One controlled live Gemini call when an API key is configured (no secret output)."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Single low-cost Gemini explain smoke (skipped if no key)."

    def handle(self, *args, **options):
        from django.conf import settings

        key = (getattr(settings, "GEMINI_API_KEY", None) or "").strip()
        if not key:
            self.stdout.write("BLOCKED: no GEMINI_API_KEY in environment")
            return

        from hair_advisor.services.gemini_explain import explain_with_gemini

        # Ensure we are not accidentally still mocked
        payload = {
            "recommendation": "POTENTIAL_MATCH",
            "ingredients": [{"inci": "Aqua", "role": "solvent"}],
            "profile": {"condition": "normal", "texture": "straight"},
        }
        try:
            result = explain_with_gemini(payload)
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"FAIL: {type(exc).__name__}"))
            raise SystemExit(1) from exc

        if not isinstance(result, dict):
            self.stdout.write(self.style.ERROR("FAIL: non-dict response"))
            raise SystemExit(1)
        bullets = result.get("summary_bullets_uz") or []
        if not bullets:
            self.stdout.write(self.style.ERROR("FAIL: empty Uzbek bullets"))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(f"PASS: bullets={len(bullets)} model_ok"))