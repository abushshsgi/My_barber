# Hair Advisor — Test results (updated)

**Date:** 2025-11-19 (completion pass)

## Executed locally

| Suite | Result |
|-------|--------|
| `hair_advisor.tests.test_barcode` | **PASS** (3 tests) |
| Django system check (with above) | **0 issues** |

## Blocked locally

| Suite | Blocker |
|-------|---------|
| `manage.py migrate hair_advisor` | `backend/.env` contains invalid Neon `DATABASE_URL` — use SQLite (unset URL) or VPS Postgres |
| `hair_advisor.tests.test_scan_api` | Requires migrated DB |
| `manage.py seed_hair_ingredients` | Requires migrated DB |
| Mobile E2E journey | Physical device / emulator not run in CI here |
| Full repo regression | DB blocker |

## Manual QA checklist (for staging)

- [ ] Scan center tab → `HairAdvisorScannerScreen`
- [ ] Barcode → `POST /hair-advisor/scans/`
- [ ] Confirm ingredients → analysis JSON
- [ ] Compare, routine, feedback, history modals
- [ ] Admin `/admin/parvarish/` Hair Advisor KPIs

## Regression (not run — DB blocked)

- Try-On, Chat, Payments, Profile — run on staging after migrate