# Hair Advisor — Backend Test Results

**Date:** 2026-11-19  
**Command:** `cd backend && set MYSALOON_FORCE_SQLITE_TESTS=1 && python manage.py test hair_advisor`

## Summary

| Metric | Value |
|--------|------:|
| Tests run | 29 |
| Passed | 28 |
| Skipped | 1 |
| Failed | 0 |

Skipped: morph_care subscription gate on scan API (existing).

## Modules

- `test_aggregation_jobs.py` (2)
- `test_barcode.py`
- `test_e2e_scenarios.py`
- `test_explanation.py`
- `test_image_similarity.py`
- `test_ingredient_import.py` (1)
- `test_merge_split.py`
- `test_missing_products.py`
- `test_permissions.py` (1)
- `test_product_verification.py`
- `test_scan_api.py`

## PostgreSQL (VPS 2026-11-19)

**Host:** `root@mysaloon.uz`  
**DB:** isolated `mysaloon_hair_staging` via `/opt/mysaloon/hair-advisor-staging/.env.hair_test`  
**Command:** `manage.py test hair_advisor -v1` (no `MYSALOON_FORCE_SQLITE_TESTS`)

| Metric | Value |
|--------|------:|
| Run | 29 |
| Passed | 28 |
| Skipped | 1 |
| Failed | 0 |

See `docs/MYSALOON_VPS_POSTGRESQL_STAGING_VALIDATION.md`.

## Not executed in this suite

- Live Gemini HTTP
- Live Gemini HTTP
- Frontend unit/E2E
- Other Django apps (payments, try-on, …)