# Admin Verification Workflow

## API (`IsAdmin` JWT)

- `GET /api/v1/admin/product-verification/dashboard/`
- `GET /api/v1/admin/product-verification/candidates/`
- `GET /api/v1/admin/product-verification/candidates/{uuid}/`
- `POST .../approve/` — body `corrected_fields`, `review_notes`
- `POST .../reject/`
- `GET /api/v1/admin/product-verification/alerts/`

## Approve

Validates evidence → `publish_candidate()` → `CareProduct` + `HairProduct` + `ProductFormula` → cache invalidation.

## Physical verification

Admin compares real packaging to candidate evidence; corrections go in `corrected_fields`. Upload verified images via Parvarish product CRUD or future catalog image API.

Django admin also registers `ProductSubmission`, `ProductCandidate`, `ProductVerification`.