# Product Verification Architecture

## Purpose

Human-verified, crowdsourced expansion of the hair-care catalog inside the existing `hair_advisor` Django app, publishing to `ai.CareProduct` + `hair_advisor.HairProduct`.

## Components

| Module | Role |
|--------|------|
| `services/verified_catalog.py` | Verified-only barcode lookup, Redis cache |
| `services/product_recognition.py` | Scan-facing lookup (no auto-external HairProduct) |
| `services/submission_pipeline.py` | User photos → Gemini OCR → normalization |
| `services/matching.py` | Stages A–C duplicate signals |
| `services/aggregation.py` | Candidate grouping, conflicts, admin alerts |
| `services/publishing.py` | Admin approve → CareProduct + Formula |
| `submission_views.py` | Customer submission API |
| `verification_admin_views.py` | Admin verification API |

## Trust tiers

1. **verified** — `CareProduct.is_verified` + published, or `HairProduct.data_quality_status=verified`
2. **provisional** — user-confirmed OCR on a scan (analysis disclaimer)
3. **unknown** — not in catalog; submission workflow

External OBF/UPC data is returned only as `external_hint`, never published automatically.