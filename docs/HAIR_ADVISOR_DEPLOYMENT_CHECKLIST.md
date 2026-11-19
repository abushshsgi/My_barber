# Hair Advisor — Deployment Checklist

## Pre-deploy (staging)

1. Set `TEST_DATABASE_URL` on CI; never use production `DATABASE_URL` for pytest.
2. `python manage.py migrate hair_advisor`
3. `python manage.py test hair_advisor`
4. `python manage.py seed_hair_ingredients` (optional, idempotent)
5. Smoke: barcode → unknown → submission → admin approve → re-scan verified.

## Environment

- `GEMINI_API_KEY` — OCR (existing `ai`) + explanations
- `REDIS_URL` — verified barcode cache (optional, locmem fallback)
- `HAIR_ADVISOR_LLM_MODEL` (optional)

## Releases

- Run migrations before API workers restart.
- Invalidate Redis keys `hair_advisor:verified_barcode:*` after bulk catalog imports.

## Production

Requires explicit authorization. Do not run against Neon until credentials validated on staging.