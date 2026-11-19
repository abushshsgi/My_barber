# Verified Catalog Migration

## Migration

- `hair_advisor/migrations/0002_product_verification.py`

Adds verification models and extends `HairProduct` with `public_id`, verification metadata, and catalog fields.

## Deploy steps (non-production)

1. Backup database.
2. `python manage.py migrate hair_advisor`
3. Run `python manage.py test hair_advisor.tests.test_product_verification`
4. Smoke-test barcode scan → unknown → submission → admin approve → re-scan.

## Data safety

No tables dropped. Existing `CareProduct` / `HairScan` rows unchanged. `public_id` populated via migration default per row.

## Rollback

Revert migration only if no production candidates exist; otherwise keep schema and disable routes.