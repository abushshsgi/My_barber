# Hair Advisor API (`/api/v1/hair-advisor/`)

Authentication: JWT (same as existing customer APIs).  
Subscription: `morph_care` rules via `morph_care_block` (same as legacy care scan).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/submissions/` | User product contribution (photos, OCR, optional price) |
| `GET` | `/submissions/` | User submissions (limit 30) |
| `GET` | `/submissions/{uuid}/` | Submission detail |
| `PATCH` | `/submissions/{uuid}/` | Confirm/correct ingredients and finalize |
| `POST` | `/scans/` | Create scan (barcode, search, manual ingredients, camera/gallery image) |
| `GET` | `/scans/` | List recent scans (alias of history, limit 50) |
| `GET` | `/scans/{uuid}/` | Scan detail + analysis if present |
| `POST` | `/scans/{uuid}/confirm-ingredients/` | Confirm INCI list and run analysis |
| `GET` | `/products/{id}/` | Published `CareProduct` by id |
| `POST` | `/analyze/` | Re-run analysis `{ "scan_id": "..." }` |
| `POST` | `/compare/` | `{ "care_product_ids": [1, 2] }` |
| `GET` | `/history/` | User scan history |
| `POST` | `/routines/` | `{ "care_product_id", "slot?" }` |
| `GET` | `/routines/current/` | Current routine |
| `PATCH` | `/routines/{id}/` | `{ "name", "notes" }` |
| `POST` | `/feedback/` | `{ "analysis_id", "helpful", "comment?" }` |
| `POST` | `/chat/` | Handoff to main Morph chat |

## Scan create body

```json
{
  "input_method": "barcode",
  "barcode": "4006381333931",
  "idempotency_key": "optional-client-key"
}
```

`input_method` values: `barcode`, `manual_barcode`, `camera_label`, `gallery`, `search`, `manual_ingredients`.

## Analysis result schema (excerpt)

```json
{
  "recommendation": "POTENTIAL_MATCH",
  "data_confidence": "high",
  "result": {
    "product": { "name": "...", "care_product_id": 12 },
    "ingredients": ["Aqua", "..."],
    "hair_fit": {},
    "key_ingredients": [],
    "limitations": ["..."],
    "explanation_uz": "..."
  }
}
```

## Error codes

| HTTP | `error_code` | Meaning |
|------|----------------|---------|
| 400 | `invalid_barcode` | Checksum / length |
| 400 | `profile_incomplete` | Hair profile required |
| 404 | — | Product / scan not found |
| 422 | `ocr_failed` | Label unreadable |

## Product verification (admin)

| Method | Path |
|--------|------|
| `GET` | `/api/v1/admin/product-verification/dashboard/` |
| `GET` | `/api/v1/admin/product-verification/candidates/` |
| `GET` | `/api/v1/admin/product-verification/candidates/{uuid}/` |
| `POST` | `.../approve/` |
| `POST` | `.../reject/` |

Barcode scans return `catalog_tier: verified` only for `CareProduct.is_verified` + published items. Unknown barcodes return `product_not_found` with `submission_allowed: true` (HTTP 200).

Legacy routes remain available:

- `GET /api/v1/products/barcode/{code}/`
- `POST /api/v1/ai/ingredient-scan/`