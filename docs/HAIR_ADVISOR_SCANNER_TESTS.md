# Hair Advisor Scanner V3 — tests

## Vitest (`apps/user`)

| File | Scenarios |
|------|-----------|
| `hair-advisor-barcode-decode.test.ts` | EAN/GTIN normalization + checksum |
| `hair-advisor-scanner-logic.test.ts` | Duplicate barcode window, FSM routing (`pick` / `resolve` / `not_found`), product-pick gate, status strings |

Run: `npm run test -w user-web`

## Playwright (`apps/user/e2e`)

Uses **mocked** `fetch`/API routes where the scan page would call the backend. No real camera stream is injected (Playwright cannot emulate barcode hardware decode reliably).

| Spec case | Mocked | Physical device required |
|-----------|--------|---------------------------|
| Demo result UI | Yes | — |
| Product pick (ambiguous OCR) | Yes (`GET …/scans/:id/`) | — |
| Live barcode in camera preview | — | **Phone / USB webcam + ZXing** |
| Torch toggle | — | **Rear camera device** |
| Permission denied UX | Partial (can deny in Chromium flags) | Real OS permission dialog optional |
| Real Gemini OCR | — | **Staging backend + Care+** |

Run:

```bash
cd apps/user
npx playwright install chromium
npm run test:e2e
```

## Accuracy benchmark (offline)

```bash
cd backend
set MYSALOON_FORCE_SQLITE_TESTS=1
python manage.py test hair_advisor.tests.test_evaluation_runner.EvaluationRunnerTests.test_generates_accuracy_report_artifact
```

Or (requires migrated local SQLite / DB + `MYSALOON_FORCE_SQLITE_TESTS=1`):

```bash
python manage.py evaluate_scanner --seed-catalog --markdown-out=docs/HAIR_ADVISOR_SCANNER_V3_ACCURACY_REPORT.md
```

See `hair_advisor/evaluation/DATASET_COLLECTION.md` for real-image dataset targets.
Read `docs/HAIR_ADVISOR_SCANNER_V3_ACCURACY_REPORT.md` — **NOT MEASURED** until real photos exist.

`PLAYWRIGHT_SKIP_WEB_SERVER=1` when dev server already on port 3000.

## Django (`backend/hair_advisor`)

```bash
cd backend
set MYSALOON_FORCE_SQLITE_TESTS=1
python manage.py test hair_advisor.tests.test_ocr_candidates hair_advisor.tests.test_barcode
```

`morph_care_block` is patched in confirm-product API tests so subscription gating does not mask validation logic.

## Manual QA checklist

1. Barcode hit → green flash → analysis result.
2. Unknown barcode → not-found panel + manual entry.
3. Rescan same code within 8s → ignored (no duplicate POST).
4. OCR ambiguous → pick screen with catalog rows only.
5. OCR no catalog match → not-found panel.
6. Pick product → analysis pipeline continues.
7. Airplane mode during lookup → error + camera restarts.