# Real-product evaluation dataset — collection guide

**Target (not current inventory):** ~50 shampoo SKUs × 3–5 photos → 150–250 images.

## Rules

1. Ground truth must be verified by a human — never copy AI `matched_product_id` into labels.
2. Do not commit end-user scan photos; use dedicated QA captures under `evaluation/images/` (gitignored).
3. Mark `annotation_verified: true` only after second reviewer sign-off.
4. Use `expected_catalog_presence: false` for products intentionally absent from MySaloon catalog.

## Required fields

See `fixtures/real_images_manifest.template.json`.

## Scenarios to cover

A–Y as listed in product spec (barcode, variants, volumes, ru/en/uz labels, blur, low light, absent catalog, etc.).

## After collection

1. Merge verified rows into `fixtures/real_images_manifest.json` (create from template).
2. Run: `python manage.py evaluate_scanner --dataset hair_advisor/evaluation/fixtures/real_images_manifest.json`
3. Archive reports under `hair_advisor/evaluation/reports/` (gitignored).