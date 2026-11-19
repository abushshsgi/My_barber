# Hair Advisor — Release Readiness

**Klassifikatsiya:** **DEPLOYED WITH NONCRITICAL LIMITATIONS** (2026-11-19)  
**Production API:** live — `hair_advisor` on `mysaloon_db`, worker enabled  
**Details:** `docs/MYSALOON_PRODUCTION_DEPLOY_REPORT.md`

## Dalillar (2026-11-19)

| Artifact | Result |
|----------|--------|
| Django `manage.py check` (VPS isolated) | OK |
| **PostgreSQL 16** `manage.py test hair_advisor` | **29 — 28 passed, 1 skipped, 0 failed** (`mysaloon_hair_staging`) |
| SQLite `hair_advisor` tests (local) | Same counts |
| VPS validation doc | `docs/MYSALOON_VPS_POSTGRESQL_STAGING_VALIDATION.md` |
| Migratsiyalar (isolated PG) | `hair_advisor` 0001–0003 applied |
| User web build (`apps/user`) | OK (prior session) |
| Admin build (`apps/admin`) | OK (prior session) |
| `mysaloon.service` during validation | **active**, not restarted |
| Prod `mysaloon_db` | **no** `hair_advisor` tables |
| Prod source | **no** `backend/hair_advisor` at `205b1fd6` |

## Qolgan xavflar

1. **Production deploy** — Hair Advisor kodi va migratsiyalar prodga kiritilmagan.
2. **Gemini** — staging `.env.hair_test` da kalit yo‘q; live smoke **ishga tushirilmagan**.
3. **Mobil / browser QA** — real qurilma va staging frontend yo‘q.
4. **E2E / monorepo regressiya** — to‘liq emas.
5. **Worker** — faqat 15s manual smoke; production systemd **enable qilinmagan**.

## Staging deploy (ruxsat bilan)

1. Prod emas, **staging checkout** yoki `/opt/mysaloon/hair-advisor-staging` orqali backend yangilash.
2. `mysaloon_hair_staging` yoki alohida staging DB da migratsiya (prod `mysaloon_db` emas).
3. `run_aggregation_worker` yoki `process_aggregation_jobs` cron — **staging**da.
4. Smoke: verified scan, submission, admin approve (staging API).

## Production

**Deploy, prod migrate, yoki systemd enable qilinmagan** — aniq ruxsatsiz.