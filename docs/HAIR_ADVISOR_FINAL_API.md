# Hair Advisor — Final API Index

Customer (`/api/v1/hair-advisor/`):

- `POST /scans/`, `GET /scans/`, `GET /scans/{uuid}/`, `POST .../confirm-ingredients/`
- `POST /submissions/`, `GET /submissions/`, `PATCH /submissions/{uuid}/`
- `POST /analyze/`, `POST /compare/`, `GET /history/`, `POST /routines/`, `POST /feedback/`

Admin:

- `GET /admin/hair-advisor/stats/`
- `GET /admin/missing-products/`
- `GET /admin/product-verification/dashboard/`
- `GET /admin/product-verification/candidates/`
- `GET|POST /admin/product-verification/candidates/{id}/approve|reject|merge|split/`

Legacy (deprecated for new UIs, still available):

- `POST /api/v1/ai/ingredient-scan/`