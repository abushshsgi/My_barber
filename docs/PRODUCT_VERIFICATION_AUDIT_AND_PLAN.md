# Product Verification — Audit & Implementation Plan

**Date:** 2025-11-19  
**Scope:** Self-expanding human-verified shampoo / hair-care catalog inside MySaloon.

## Phase 1 — Existing state (summary)

| Area | Current behavior | Gap vs target |
|------|------------------|---------------|
| `ai.CareProduct` | Admin CRUD, `is_verified`, barcode, INCI | Canonical published catalog; no formula versioning |
| `hair_advisor.HairProduct` | 1:1 `care_product`, `data_quality_status` | Missing UUID, `verified_by/at`, `ProductFormula`, multi-barcode |
| `hair_advisor.HairScan` | Barcode → DB + **auto external** HairProduct | External data treated as found product; no crowdsourced pipeline |
| `product_recognition.lookup_by_barcode` | Creates unverified `HairProduct` from OBF/UPC | Violates “never auto-verify user/external data” |
| OCR | `gemini_ingredient.analyze_ingredient_from_data_url` | Reuse for submissions; need raw OCR retention |
| Admin | `admin/parvarish/products/*`, Hair Advisor stats | No candidate review workspace |
| Mobile | `HairAdvisorScannerScreen` | `product_not_found` → error only; no submission UX |
| Tests | `test_scan_api`, `test_barcode` | No duplicate/conflict/approval tests |

**Reuse (no duplicate apps):**

- Verified catalog anchor: extend **`HairProduct`** + publish to **`CareProduct`**
- INCI normalization: `ingredient_engine.normalize_ingredient_list`
- Analysis: `analysis.run_analysis_for_scan` with `data_confidence` / disclaimer flags
- Media: `ImageField` paths `care/products/`, `hair-advisor/`
- Permissions: `IsAdmin` for approval; customer JWT for submissions

**Do not delete:** `CareProduct`, `IngredientScanEntry`, existing `HairScan` rows.

## Phase 2 — Schema (implemented in `0002_product_verification`)

1. Extend `HairProduct` — `public_id`, `product_line`, `description`, `manufacturing_country`, `verified_by`, `verified_at`
2. `ProductBarcode` — multiple barcodes per product
3. `ProductFormula` — versioned INCI (no overwrite of verified rows)
4. `ProductSubmission` — user photos, OCR, status
5. `ProductCandidate` — aggregated proposal + conflicts
6. `CandidateSubmission` — M2M
7. `ProductVerification` — admin audit
8. `ProductPriceObservation`, `ProductConflict`, `ProductCatalogImage`, `ProductVerificationAlert`

## Phase 3–6 — Pipelines

```
Scan barcode → lookup_verified_catalog()
  ├─ verified match → HairScan + verified analysis disclaimer
  └─ no match → PRODUCT_NOT_FOUND + submission endpoints
       → OCR (Gemini) → normalize → aggregate_submission()
            → duplicate stages A–F → candidate → admin alert
```

**Matching thresholds** (settings / constants, conservative):

- Barcode exact: auto-link candidate
- Brand+name ratio ≥ 0.82 + size match: metadata stage
- INCI Jaccard ≥ 0.88: same formula group
- Same barcode + INCI Jaccard < 0.65: `ProductConflict` (formula variation / OCR error)

## Phase 7–9 — Admin & publish

- API: `/api/v1/admin/product-verification/*` (dashboard, candidates, approve/reject/merge/split)
- Publish: transaction → `CareProduct` + `HairProduct` + `ProductFormula` + cache invalidation
- React admin route: `admin.parvarish.verification.tsx` (list + detail)

## Phase 10–11 — Client messaging

| State | Uzbek copy |
|-------|------------|
| Verified catalog | Mahsulot ma'lumotlari MySaloon tomonidan tekshirilgan. |
| Not in DB | Mahsulot bazamizda topilmadi. Uni birgalikda aniqlaymiz. |
| Submitted | Mahsulot ma'lumotlari tekshiruvga yuborildi. |
| Provisional analysis | Bu dastlabki tahlil. Mahsulot tarkibi hali MySaloon tomonidan tasdiqlanmagan. |

## Phase 12–16 — Non-functional

- Redis cache key `hair_advisor:verified_barcode:{code}` (invalidated on publish)
- Rate limits on submission create (reuse morph_care_block)
- Admin-only approve; OCR text never writes verified rows directly

## Phase 17 — Tests (target)

`hair_advisor.tests.test_product_verification` — full workflow A→admin→verified scan

## Phase 18 — Docs deliverables

- `PRODUCT_VERIFICATION_ARCHITECTURE.md`
- `PRODUCT_SUBMISSION_FLOW.md`
- `DUPLICATE_MATCHING_ALGORITHM.md`
- `ADMIN_VERIFICATION_WORKFLOW.md`
- `VERIFIED_CATALOG_MIGRATION.md`
- `PRODUCT_VERIFICATION_TEST_RESULTS.md`

## Rollout order

1. Migrations + services (this PR)
2. API + scan integration + tests
3. Admin UI + mobile submission polish
4. Production deploy (explicit approval only)