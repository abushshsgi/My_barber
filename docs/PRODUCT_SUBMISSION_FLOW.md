# Product Submission Flow

1. User scans barcode → `POST /api/v1/hair-advisor/scans/` (`input_method: barcode`).
2. If verified match → ingredients + `catalog_tier: verified`.
3. If unknown → `status: product_not_found`, `submission_allowed: true`, Uzbek prompt.
4. User uploads front + ingredient label → `POST /api/v1/hair-advisor/submissions/`.
5. OCR (Gemini) fills `normalized_ingredients`; user may PATCH to correct.
6. `finalize_submission` runs aggregation → `ProductCandidate` + optional `ProductConflict`.
7. Admin reviews → approve publishes to catalog; future scans use verified lookup.