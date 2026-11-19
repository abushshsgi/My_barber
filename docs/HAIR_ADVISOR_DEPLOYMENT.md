# Hair Advisor — Deployment

## Preconditions

- PostgreSQL accessible with valid `DATABASE_URL`
- Redis for existing channels/cache (unchanged)
- `GEMINI_API_KEY` for OCR scans (existing)
- Morph Care subscription logic enabled (existing)

## Steps

1. Pull code with `hair_advisor` app.
2. `pip install -r requirements.txt` (no new packages required).
3. `python manage.py migrate hair_advisor`
4. Restart API service (Daphne/uwsgi/systemd per existing `backend/bin/start.sh`).
5. Deploy mobile + user frontends (nav Scan center).

## Health check

```bash
curl -H "Authorization: Bearer <token>" https://<api>/api/v1/hair-advisor/history/
```

Expect `200` and `[]` for new users.

## Workers

No new worker unit required for v1 (synchronous analysis). Monitor API latency; if OCR volume grows, route `processing_ocr` to async worker using existing Redis patterns from Try-On (separate queue name `hair_advisor`).

## Rollback

1. Revert frontend nav commits if needed.
2. `migrate hair_advisor zero`
3. Remove `hair_advisor` from `INSTALLED_APPS` and url include (optional; harmless if left).

## Secrets

Do not commit `.env`. Required variables unchanged from Parvarish stack.