# Hair Advisor Scanner V3 — Accuracy Report

_Generated: 2026-11-21 08:57 UTC_

## Executive summary

**Real-world camera accuracy: NOT MEASURED.**
No verified on-disk product photograph samples were present in the evaluation manifest.
Figures below reflect **offline OCR/barcode fixtures only** — not production recognition accuracy.

## Test environment

- Dataset: `hair_advisor\evaluation\fixtures\offline_manifest.json`
- Scope: offline_ocr_and_barcode_fixtures
- Total manifest rows: 8
- OCR/barcode fixtures: 8
- Real image files on disk: 0
- Target collection goal: 50 products × 3–5 images (150–250) — **not yet collected in repo**

## Ground-truth verification

- Offline fixtures: `annotation_source=qa_synthetic_fixture` unless otherwise noted.
- Independent human verification required before treating metrics as release evidence.

## Accuracy metrics (explicit denominators)

| Metric | Value | Denominator / notes |
|--------|-------|---------------------|
| False Match Rate | NOT MEASURED | incorrect auto IDs / auto decisions (0) |
| False Not Found Rate | 0.00% | catalog-present samples (4) |
| Exact auto accuracy | 0.00% | evaluated=7 |
| Recall@1 | 100.00% | catalog-present |
| Recall@3 | 100.00% | catalog-present |
| Recall@5 | 100.00% | catalog-present |
| Ambiguous rate | 14.29% | evaluated |
| Insufficient image rate | 14.29% | evaluated |
| Service failure rate | 14.29% | evaluated |
| AI fallback (fixture) | 85.71% | OCR fixtures use mocked Gemini payload |
| AI cost | NOT MEASURED | no billed live AI calls in default offline mode |

## Latency (recognition engine only)

- Median: 2 ms
- P95: 3.7 ms
- Max: 4 ms

## Quality gates

_Gates not enforced (insufficient catalog-present labeled samples)._
- Quality gates NOT APPLIED: catalog-present samples=4 (minimum 30 required for gate enforcement).

## False match details

_No automatic false matches in this run._

## False not-found (catalog present)

_None in this run._

## Per-sample outcomes

- `ocr-clear-repair-exact` E_similar_names → exact_match pred=None gt=1 2ms
- `ocr-clear-ambiguous-variant` F_same_brand_variants → ambiguous pred=None gt=1 1ms
- `ocr-insufficient-label` J_blurry_image → insufficient_image_quality pred=None gt=None 0ms
- `ocr-invalid-ai-id` R_ai_invalid_product_id → exact_match pred=None gt=1 2ms
- `ocr-catalog-absent` P_product_absent_from_catalog → not_found pred=None gt=None 4ms
- `barcode-invalid-checksum` B_barcode_not_in_db → invalid_barcode pred=None gt=None 0ms
- `barcode-unknown-ean13` B_barcode_not_in_db → service_unavailable pred=None gt=None 0ms **[No module named 'redis']**
- `ocr-ru-brand-normalization` M_russian_label → exact_match pred=None gt=1 3ms

## Deployment recommendation

Do **not** treat unit/E2E pass rates as recognition accuracy.
Collect the real-product image dataset, re-run `evaluate_scanner`, then reassess gates.
