# Scanner V2 — Engineering Report

**Date:** 2026-11-27  
**Scope:** Universal Smart Scanner integrated with existing Hair Advisor

## Existing architecture discovered

- Web: `apps/user` Hair Advisor 2 scan pages + `@zxing/browser` / BarcodeDetector  
- Mobile: Expo 57 + `expo-camera`  
- Backend: Django `hair_advisor` + `ai` product barcode lookup (OBF, UPCitemdb trial)  
- API kept: `/api/v1/hair-advisor/scans|analyze|history|…`

## Code retained

- Hair Advisor analysis pipeline (`analysis.py`, hybrid recognition)  
- Verified catalog + CareProduct models  
- `HairAdvisorBarcodeCamera`, barcode-camera helpers  
- Barber booking QR scanners (unrelated)  
- Existing scan/history/recover/pick/result routes

## Code refactored

- `hair-advisor-barcode-decode.ts` → `@mybarber/scanner`  
- `use-hair-advisor-scanner` → `use-smart-scanner` (re-export)  
- `product_recognition.lookup_by_barcode` → staged `resolve_product_by_barcode`  
- `barcode.py` → scanner normalize (GTIN-14, UPC-E)  
- Scanner overlay/theme (removed arbitrary purple)  
- Web + mobile scan UIs (modes, no barcode shutter, i18n)  
- Result compatibility labels (qualitative, no fake %)

## Code replaced / removed

| Removed | Reason |
|---------|--------|
| `MorphIngredientScreen.legacy.tsx` | Unused; superseded by HairAdvisor2 |
| `HairAdvisorWebScanPage.tsx` | Unwired legacy |
| `MorphAiIngredientScanPage.tsx` | Unwired legacy |

## Files created

- `docs/scanner-v2-audit.md`  
- `docs/scanner-v2-implementation-plan.md`  
- `docs/scanner-v2-capability-matrix.md`  
- `docs/scanner-v2-engineering-report.md`  
- `packages/scanner/**`  
- `backend/hair_advisor/services/scanner/**`  
- `backend/hair_advisor/tests/test_scanner_barcode_normalize.py`  
- `apps/user/src/hooks/use-smart-scanner.ts`  
- `apps/user/src/lib/advisor-integration.ts`

## Dependencies

| Added | Removed |
|-------|---------|
| `@mybarber/scanner` (workspace) on user-web + mobile | None (zxing kept) |

## Database migrations

None. Reused existing HairProduct / HairScan / ProductSource tables.

## API changes

No new public routes. Behavior of `POST /hair-advisor/scans/` improved via normalize + staged providers.

## AI Advisor integration

`analyzeScannedProduct` / `resolveScanToAnalysis` continue to call existing confirm-ingredients + analyze endpoints. No second Advisor.

## Platform status

| Platform | Status | Notes |
|----------|--------|-------|
| Web | Implemented | Theme + FSM + i18n + desktop side panel |
| Android (Expo) | Implemented (code) | Requires device/dev client for camera QA |
| iOS (Expo) | Implemented (code) | Same; not executed on physical device in this session |

## Supported barcode formats

See `docs/scanner-v2-capability-matrix.md`. Primary live: EAN-13/8, UPC-A/E. Extended via image/ZXing where available. No country-prefix product gating.

## Tests executed

| Suite | Result |
|-------|--------|
| `packages/scanner` vitest | 15 passed |
| `apps/user` hair-advisor barcode/scanner vitest | 11 passed |
| `backend` `test_scanner_barcode_normalize.py` | 7 passed |
| Playwright scanner e2e | Extended specs authored; not run in this session (needs app server) |
| Physical device barcode QA | Not executed |

## Known limitations

- Product coverage depends on verified DB + OBF + UPCitemdb trial; many SKUs will hit not-found → image/OCR fallback.  
- Paid Barcode Lookup / GS1 APIs not configured (no invented keys).  
- Live mobile decode limited to Expo primary types; extended formats via gallery/OCR.  
- Offline: local decode/validate only; remote lookup/AI require network.  
- Demo result route `/result/demo` remains for UI smoke only.

## Environment variables

- Existing AI/Gemini keys for OCR/analysis  
- No new required client secrets  
- Optional future paid provider keys: unset by default

## Run commands

```bash
# Shared scanner tests
npm run test -w @mybarber/scanner

# Web unit tests
npm run test -w user-web

# Backend
cd backend && .venv/Scripts/python.exe -m pytest hair_advisor/tests/test_scanner_barcode_normalize.py -q

# Web / mobile apps
npm run dev:user
npm run dev:mobile
```

## Honest non-claims

- Did not claim 100% global product coverage.  
- Did not run physical Android/iOS camera matrix in this session.  
- Did not enable unauthorized scraping or fake verified products.
