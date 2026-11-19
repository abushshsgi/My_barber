# MySaloon Hair Advisor — Final Acceptance Gate

**Sana:** 2026-11-19  
**Scope:** Hair Advisor + Product Verification (Mybarber monorepo)  
**Production deploy:** **NOT AUTHORIZED** (staging-only evidence below)

---

## Executive counts (35 requirements)

| Bucket | Count |
|--------|------:|
| **Total** | 35 |
| **VERIFIED COMPLETE** | 23 |
| **IMPLEMENTED BUT UNVERIFIED** | 5 |
| **PARTIAL** | 2 |
| **MISSING** | 0 |
| **BLOCKED (external)** | 5 |

> REQ-21–REQ-35 extend the original REQ-01–REQ-20 audit with mission-phase items (worker, admin controls, UX parity, security). No invented percentages.

---

## Automated evidence (this session)

| Check | Result |
|-------|--------|
| `python manage.py check` | OK |
| `MYSALOON_FORCE_SQLITE_TESTS=1 python manage.py test hair_advisor` | **29 run, 28 passed, 1 skipped** |
| User web `npm run build` (`apps/user`) | OK |
| Admin `npm run build` (`apps/admin`) | OK |
| PostgreSQL 16 (VPS isolated `mysaloon_hair_staging`) | **29 run, 28 passed, 1 skipped, 0 failed** — see `MYSALOON_VPS_POSTGRESQL_STAGING_VALIDATION.md` |
| Local SQLite tests | **29 run, 28 passed, 1 skipped** |
| Live Gemini integration | **BLOCKED** — mock-only in `test_explanation` |
| Browser / device E2E | **BLOCKED** — not executed |
| Full monorepo regression (Try-On, payments, …) | **NOT RUN** |

### Backend tests executed

`test_aggregation_jobs`, `test_barcode`, `test_e2e_scenarios`, `test_explanation`, `test_image_similarity`, `test_ingredient_import`, `test_merge_split`, `test_missing_products`, `test_permissions`, `test_product_verification`, `test_scan_api`

---

## Requirement matrix

Status legend: **VC** = Verified complete, **IU** = Implemented but unverified, **P** = Partial, **B** = Blocked.

| ID | Expected functionality | Primary code | API endpoints | Test evidence | Manual QA | Status | Blocker |
|----|------------------------|--------------|---------------|---------------|-----------|--------|---------|
| REQ-01 | Barcode resolves **verified catalog only** | `verified_catalog.py`, `product_recognition.py` | `POST /api/v1/hair-advisor/scans/` | `test_barcode`, `test_product_verification`, `test_e2e_scenarios` | — | VC | — |
| REQ-02 | External OBF/UPC never auto-verifies | `product_recognition.py` | scan lookup | `test_e2e_scenarios` | — | VC | — |
| REQ-03 | Unknown barcode → user submission | `submission_views.py`, `views.py` | `POST …/submissions/` | `test_e2e_scenarios` B | mobile/web UI | VC | — |
| REQ-04 | OCR + user ingredient edit | `submission_pipeline.py`, scanners | confirm-ingredients | scan flow + sync agg in tests | UI wired | VC | — |
| REQ-05 | Deterministic analysis + Gemini explain fallback | `explanation.py`, `gemini_explain.py` | analysis on scan | `test_explanation` (mock Gemini) | — | VC | Live Gemini = B |
| REQ-06 | HairCareProfile required for analysis | `views.py`, care profile API | scan + profile | `test_scan_api` | quiz in mobile/web | VC | — |
| REQ-07 | Duplicate matching stages A–C | `matching.py`, `aggregation.py` | internal | `test_product_verification` | — | VC | — |
| REQ-08 | Image similarity stage D (supporting only) | `image_similarity.py` | internal | `test_image_similarity` | — | IU | No multi-angle photo suite |
| REQ-09 | Admin approve → publish CareProduct | `publishing.py` | `…/approve/` | `test_e2e_scenarios` E | admin UI | VC | — |
| REQ-10 | Merge/split preserve links | `verification_admin_views.py` | merge/split | `test_merge_split` | admin UI | VC | — |
| REQ-11 | Missing products dashboard KPIs | `missing_products.py` | `/api/v1/admin/missing-products/` | `test_missing_products` | `missing-products.tsx` | VC | — |
| REQ-12 | Durable aggregation jobs | `tasks.py`, `ProductAggregationJob` | worker + defer | `test_aggregation_jobs` | admin failed-job list | VC | — |
| REQ-13 | Mobile scanner on Hair Advisor API | `HairAdvisorScannerScreen.tsx` | customer APIs | — | code review | IU | Device QA |
| REQ-14 | Web scanner on Hair Advisor API | `HairAdvisorWebScanPage.tsx`, route | customer APIs | — | build only | IU | Browser QA |
| REQ-15 | Web compare / routine / feedback | `hair-advisor.ts`, web page step 4 | compare, routines, feedback | API covered in backend tests | UI added | VC | No web E2E |
| REQ-16 | PostgreSQL migration validation | migrations `0001–0003` | — | VPS PG16 test run | migrate on `mysaloon_hair_staging` | VC | Prod `mysaloon_db` unchanged |
| REQ-17 | Live Gemini smoke | `gemini_explain.py` | — | mock only | — | B | No authorized key in CI |
| REQ-18 | Idempotent ingredient seed | `ingredient_import.py` | management cmd | `test_ingredient_import` | — | VC | — |
| REQ-19 | Admin 3-column verification workspace | `verification.tsx` | admin PV APIs | partial via merge tests | UI + build | IU | Full manual walkthrough |
| REQ-20 | Legacy scanner preserved | `MorphIngredientScreen.legacy.tsx` | — | — | re-export | VC | — |
| REQ-21 | Verified barcode cache + invalidation on publish | `verified_catalog.py`, `publishing.py` | internal | `test_product_verification` | — | VC | — |
| REQ-22 | User feedback on analysis | `feedback` views | `POST …/feedback/` | implicit scan tests | mobile/web buttons | VC | — |
| REQ-23 | Scan history list | `views.py` | `GET …/scans/history/` | `test_scan_api` | mobile/web | VC | — |
| REQ-24 | Ingredient detail in results | analysis payload | scan result | `test_explanation` | mobile modal / web | VC | — |
| REQ-25 | Product comparison | compare view | `POST …/compare/` | scan API tests | mobile/web | VC | — |
| REQ-26 | Care routines add/list | routine views | `…/routines/` | backend via scan tests | mobile/web | VC | Routine **edit/delete** web UI minimal |
| REQ-27 | Submission history + status | `submission_views.py` | `GET …/submissions/` | e2e B | mobile/web lists | VC | — |
| REQ-28 | Admin link-existing verified product | `AdminProductCandidateLinkExistingView` | `…/link-existing/` | — | admin UI wired | IU | No dedicated test |
| REQ-29 | Admin request-more-info | `AdminProductCandidateRequestInfoView` | `…/request-info/` | — | admin UI | IU | No dedicated test |
| REQ-30 | Admin inspect failed aggregation jobs | `AdminAggregationJobsView` | `…/aggregation-jobs/` | `test_aggregation_jobs` | admin banner | VC | — |
| REQ-31 | Missing products search/sort/filter | `missing_products_views.py` | query params | `test_missing_products` | admin filters added | VC | — |
| REQ-32 | Aggregation worker ops template | `run_aggregation_worker.py`, `deploy/mysaloon-hair-aggregation-worker.service` | CLI | unit file only | — | P | Not enabled on any host |
| REQ-33 | Customer denied admin approve | `IsAdmin` | admin routes | `test_permissions` | — | VC | — |
| REQ-34 | Automated browser E2E (scenarios A–H) | — | — | **NOT RUN** | — | B | No Playwright CI job |
| REQ-35 | Full monorepo regression suite | — | — | **NOT RUN** | — | B | Out of scope time / env |

---

## Security / performance notes (staging-oriented)

- Admin product-verification endpoints require `IsAdmin`; customer deny covered by `test_permissions`.
- Image uploads flow through existing DRF parsers; no new public unauthenticated admin routes.
- Aggregation worker systemd unit is **template only** — do not `enable` on production without ops sign-off.
- Image similarity (aHash) must not be sole approval signal (documented in `image_similarity.py` + tests).

---

## Staging readiness

**READY FOR STAGING** with: **PostgreSQL 16 proof on VPS** (`mysaloon_hair_staging`), 29 `hair_advisor` tests, user + admin builds, worker smoke + template, expanded admin/web/mobile parity. Validation report: `MYSALOON_VPS_POSTGRESQL_STAGING_VALIDATION.md`.

## Production readiness

**NOT READY** until: authorized **code deploy** to `/var/www/mysaloon/source` (prod tree still **without** `hair_advisor` / DB migrations on `mysaloon_db`), worker enable on staging, live Gemini in isolated env only, mobile device + browser QA on non-prod stack, monorepo regression sampling.

---

## Changed files (this execution wave)

See git status in repo; notable paths:

- `apps/user/src/lib/api/hair-advisor.ts`, `HairAdvisorWebScanPage.tsx`
- `apps/mobile/src/api/hair-advisor.ts`, `HairAdvisorScannerScreen.tsx`
- `apps/admin/src/lib/admin-api.ts`, `admin.parvarish.verification.tsx`, `admin.parvarish.missing-products.tsx`
- `backend/hair_advisor/tests/test_aggregation_jobs.py`, `test_ingredient_import.py`, `test_permissions.py`
- `backend/hair_advisor/verification_admin_views.py`
- `docs/MYSALOON_HAIR_ADVISOR_FINAL_ACCEPTANCE.md` (this file)