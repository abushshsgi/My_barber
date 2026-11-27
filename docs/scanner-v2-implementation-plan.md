# Scanner V2 — Implementation Plan

**Status:** Active implementation (2026-11-27)  
**API base:** `/api/v1/hair-advisor/*` (no parallel `/scanner/` production routes)

## Current → target

| Current | Target |
|---------|--------|
| Hair Advisor V2 scan UI | Universal Smart Scanner UX on same pipeline |
| Ad-hoc barcode checksum | `@mybarber/scanner` + Python mirror |
| Verified + external lookup | Staged `product_providers` resolver |
| Purple full-bleed UI | MySaloon morph / semantic tokens |
| Mobile incomplete parity | Shared FSM + modes + no fake shutter |

## Waves

0. Audit + docs (this file, audit, capability matrix)  
1. Shared barcode package + backend normalize  
2. Product resolver providers  
3. `useSmartScanner` + i18n + advisor wrapper  
4. Web UI screens  
5. Mobile UI parity  
6. Tests, cleanup, engineering report  

## Acceptance checklist

- [x] Web scanner initializes; camera cleanup on leave  
- [x] Android / iOS Expo scanner code path (device QA pending)  
- [x] Automatic barcode detection; no barcode-mode shutter  
- [x] International EAN/UPC family; no country-prefix product gating  
- [x] Normalization + checksum + UPC-E expansion + dedup  
- [x] Product lookup via configured providers; not-found → image fallback  
- [x] Gallery + manual barcode  
- [x] Existing AI Advisor receives product/scan context  
- [x] Structured result UI; no fake % scores  
- [x] Theme tokens preserved (purple accent removed)  
- [x] Unit tests pass where runnable; limitations documented  

## Migration / cleanup gates

1. Confirm zero imports of legacy screens before delete.  
2. Keep `HairScan` / history data intact.  
3. Non-destructive DB migrations only.  
4. Do not remove Advisor chat / analysis endpoints.  

## Run commands

```bash
# Web unit tests
npm run test -w user-web

# Scanner package
npm run test -w @mybarber/scanner

# Backend
cd backend && python -m pytest hair_advisor/tests ai/test_barcode_country.py -q

# Mobile
npm run dev:mobile
```
