# Missing Products Dashboard — "Bazamizda yo'q mahsulotlar"

## Route

- Admin UI: `/admin/parvarish/missing-products`
- API: `GET /api/v1/admin/missing-products/`

## Query params

`brand`, `status`, `q`, `sort` (`most_scans`, `most_users`, `most_recent`, `highest_priority`, `most_conflicts`, `oldest_pending`), `page`, `page_size`

## Priority

Explainable score from unique users, scan frequency, submissions, conflicts, pending age, ingredient completeness (`missing_products._explain_priority`).

## Data sources

- `HairScan` with `product_not_found`
- `ProductSubmission`, `ProductCandidate`, `ProductConflict`