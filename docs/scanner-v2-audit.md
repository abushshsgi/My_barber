# Scanner V2 — Repository Audit

**Date:** 2026-11-27  
**Scope:** MySaloon Universal Smart Scanner (Hair Advisor V2 evolution)

## Architecture discovered

| Layer | Stack |
|-------|--------|
| Web | `apps/user` — Vite, TanStack Router, React 18, `@zxing/browser` |
| Mobile | `apps/mobile` — Expo 57, `expo-camera`, React Navigation |
| Backend | Django `hair_advisor` + `ai` apps under `/api/v1/hair-advisor/*` |
| Shared packages | `@mybarber/shared` (no scanner module yet) |

## File inventory and classification

### KEEP

| Path | Role |
|------|------|
| `backend/hair_advisor/urls.py` | Scans, analyze, history, chat |
| `backend/hair_advisor/models.py` | HairProduct, HairScan, ProductSource, Ingredient* |
| `backend/hair_advisor/services/analysis.py` | OCR + Advisor analysis |
| `backend/hair_advisor/services/hybrid_recognition/` | Image/OCR recognition |
| `backend/hair_advisor/services/verified_catalog.py` | Verified-first lookup |
| `backend/ai/services/product_barcode_lookup.py` | OBF + UPCitemdb |
| `apps/user/src/components/ai-style/HairAdvisorBarcodeCamera.tsx` | Live decode |
| `apps/user/src/lib/barcode-camera.ts` | Camera diagnostics / torch |
| `apps/user/src/lib/api/hair-advisor.ts` | API client |
| `apps/barber/.../CheckInScanner.tsx` | Unrelated booking QR |

### REFACTOR

| Path | Why |
|------|-----|
| `apps/user/src/hooks/use-hair-advisor-scanner.ts` | Expand FSM, i18n, cancellation |
| `apps/user/src/lib/hair-advisor-scanner-logic.ts` | Move status strings to i18n; share FSM |
| `apps/user/src/lib/hair-advisor-barcode-decode.ts` | Delegate to `@mybarber/scanner` |
| `apps/user/src/components/hair-advisor-2/*` | Theme tokens, desktop layout, result sections |
| `apps/mobile/.../HairAdvisor2ScanScreen.tsx` | Parity with web FSM/UX |
| `backend/hair_advisor/services/barcode.py` | GTIN-14, UPC-E, identifier types |
| `backend/ai/services/barcode_country.py` | Keep for display only; never gate lookup |

### REPLACE (behavior)

| Path | Replacement |
|------|-------------|
| Mobile scan screen logic | Shared `useSmartScanner` + `@mybarber/scanner` |
| Hardcoded purple scanner theme | Morph / semantic tokens |

### REMOVE (after reference audit)

| Path | Notes |
|------|-------|
| `apps/mobile/.../MorphIngredientScreen.legacy.tsx` | Superseded by HairAdvisor2 |
| `apps/user/.../HairAdvisorWebScanPage.tsx` | Legacy if unwired |
| `apps/user/.../MorphAiIngredientScanPage.tsx` | Legacy if unwired |

### CREATE

| Path | Role |
|------|------|
| `packages/scanner/` | Shared barcode core + FSM types |
| `backend/hair_advisor/services/scanner/` | Normalize + product providers |
| `docs/scanner-v2-*.md` | Audit, plan, matrix, report |

## Existing functionality

- Automatic barcode scan (web BarcodeDetector + ZXing fallback).
- Mobile live scan via `expo-camera` (EAN/UPC family).
- Scan create → verified catalog → external hint → OCR recover → analyze.
- History list, product pick, ingredient recover, structured result pages.
- Evaluation harness under `backend/hair_advisor/evaluation/`.

## Bugs / gaps

1. Mobile has no client checksum / dedup; center button looks like shutter.
2. No UPC-E expansion or GTIN-14 / GS1 Digital Link parsing.
3. Scanner theme uses arbitrary purple (`#8B5CF6`).
4. Status strings hardcoded Uzbek in web logic.
5. Mobile lacks Barcode | Image mode selector and manual entry UX.
6. Web/mobile scan-flow duplicated.
7. Extended barcode formats not advertised correctly on live mobile decode.
8. Demo result path (`result/demo`) must stay non-production-only.

## Broken / incomplete integrations

- Paid barcode providers (Barcode Lookup, GS1) not configured — trial UPCitemdb only.
- Country prefix detection used as metadata; must not restrict products (verify no gating).

## Duplicate implementations

- `scan-flow.ts` web vs mobile copies.
- Legacy Morph ingredient scanner vs HairAdvisor2.
- Barcode checksum on web client + Django `barcode.py`.

## Outdated dependencies

- `@zxing/browser` ^0.1.5 — usable; keep with capability matrix.
- No `react-native-vision-camera` (correct — Expo uses `expo-camera`).

## Missing functionality (vs Universal Scanner V2)

- Shared `NormalizedBarcode` model and state machine package.
- Staged provider abstraction with negative cache.
- Premium UI aligned to MySaloon tokens.
- Full offline messaging for remote lookup/AI.
- Comprehensive GTIN unit tests.

## Reusable code

Camera adapters, hair-advisor API client, hybrid recognition, verified catalog, Advisor analysis, i18n locale files, history UI.

## Platform limitations

| Platform | Live decode | Gallery decode | Torch |
|----------|-------------|----------------|-------|
| Chrome desktop/Android | BarcodeDetector or ZXing | ZXing | Device-dependent |
| Safari iOS | Often ZXing fallback | ZXing | Limited |
| Android Expo | expo-camera EAN/UPC | Image → API OCR (+ optional JS decode) | Yes |
| iOS Expo | Same | Same | Yes |

## Security / privacy

- Third-party lookups must stay on backend.
- Do not log full hair profiles or raw AI prompts.
- Do not auto-open scanned URLs.
- Image retention only via authenticated scan upload pipeline.

## Environment variables

- Django AI / Gemini keys (existing).
- Optional future paid barcode API keys (unset by default).
- No client-side provider secrets.

## Prior docs

- `docs/HAIR_ADVISOR_SCANNER_V2_PLAN.md` — superseded by `docs/scanner-v2-implementation-plan.md`.
