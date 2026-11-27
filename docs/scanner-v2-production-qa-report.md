# Scanner V2 — Production Hardening & QA Report

**Date:** 2026-11-27  
**Base commit:** `f0573e39` — *Implement Universal Smart Scanner V2 on the Hair Advisor pipeline*  
**Branch:** `main` (local fixes **not pushed**)  
**Scope:** Production hardening & deep QA of existing Universal Smart Scanner V2 — no full rebuild

---

## Executive verdict

**Production readiness: NOT READY**

Critical real-device camera QA (Android Chrome, iOS Safari, Expo Android/iOS physical devices) was **not** executed in this session. Automated unit + simulated Playwright coverage passes. Safe in-repo fixes were applied and left **unpushed** for user approval before deploy.

---

## Requirements coverage table

Statuses: `IMPLEMENTED AND VERIFIED` | `IMPLEMENTED BUT UNTESTED` | `PARTIALLY IMPLEMENTED` | `NOT IMPLEMENTED` | `BROKEN` | `BLOCKED BY EXTERNAL REQUIREMENTS`

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Shared `@mybarber/scanner` normalize + checksum + UPC-E + GTIN-14 + GS1 Digital Link | **IMPLEMENTED AND VERIFIED** | `packages/scanner` vitest **21 passed**; backend `test_scanner_barcode_normalize.py` **10 passed**; GTIN-14→UPC/EAN candidates fixed |
| 2 | Scan FSM / dedup helpers | **IMPLEMENTED AND VERIFIED** | `scanDeduplicator` + `scannerStateMachine` unit tests |
| 3 | Web live decode (BarcodeDetector + ZXing) | **IMPLEMENTED BUT UNTESTED** (physical) | `HairAdvisorBarcodeCamera.tsx`; HTTPS gate in `diagnoseCameraAccess()`; e2e does not exercise camera stream |
| 4 | Secure-context / HTTPS camera gate | **IMPLEMENTED AND VERIFIED** (code) | `barcode-camera.ts` `isSecureContext`; toast on insecure |
| 5 | Web scan lock + stale response ignore | **IMPLEMENTED AND VERIFIED** (code + regression fix) | `use-smart-scanner.ts` `lockRef`/`sessionRef`/`lookupInFlightRef`; cancel now clears success timer; timer checks session before lookup |
| 6 | Camera cleanup on unmount / leave | **IMPLEMENTED BUT UNTESTED** (physical LED) | Web effect cleanup stops tracks; mobile `useIsFocused` unmounts `CameraView` |
| 7 | Mobile Expo live scan (EAN/UPC), no barcode shutter | **IMPLEMENTED BUT UNTESTED** (device) | `HairAdvisor2ScanScreen.tsx`; shutter only in `product_image`; `expo-camera ~57.0.4`; permissions in `app.config.ts` |
| 8 | Mobile checksum + dedup + session cancel | **IMPLEMENTED BUT UNTESTED** (device) | `@mybarber/scanner` validators; `sessionRef` + cancel bump added this session |
| 9 | Mode selector Barcode \| Image (web + mobile) | **IMPLEMENTED AND VERIFIED** (UI e2e web) | Playwright mode selector; mobile chips present in code |
| 10 | Gallery + manual barcode | **PARTIALLY IMPLEMENTED** | Web: gallery may ZXing-decode barcode first then lookup (e2e covers manual UI). Mobile: gallery always uploads image — **no client barcode-from-image decode** ([Audit mobile scanner](d519c40e-d80d-45bd-8c20-4e4203837aef)) |
| 11 | Product resolver staged providers | **IMPLEMENTED AND VERIFIED** (mocked) | `test_scanner_product_resolver.py` **7 passed** — chain order, invalid, not-found, inflight cache, neg-cache |
| 12 | Verified-first; external never auto-verified | **IMPLEMENTED AND VERIFIED** (code + unit) | `chain.py` early exit on verified; external `found=False` |
| 13 | Negative / hint cache | **IMPLEMENTED AND VERIFIED** (mocked) | `external.py` NEG/HINT TTL; unit asserts network skip |
| 14 | Country prefix as metadata only (no product gate) | **IMPLEMENTED AND VERIFIED** (code review) | `barcode_country.py` used for display fields in lookup parsers; resolver does not filter by country |
| 15 | Advisor integration (no second Advisor) | **IMPLEMENTED AND VERIFIED** (code + demo e2e) | `advisor-integration.ts` → `resolveScanToAnalysis` → confirm/analyze; qualitative labels only |
| 16 | No fake % match scores in scanner UI | **IMPLEMENTED AND VERIFIED** (UI) / note | Result UI uses qualitative labels only (e2e). Backend `care_match` still computes heuristic `safety_score` / `match_percent` in analysis JSON — not shown on V2 result page ([Audit backend scanner](ed48fa15-4922-4cf8-9781-69e939965410)) |
| 17 | Result UI: compatibility, missing info, sources | **PARTIALLY IMPLEMENTED** → improved | Compatibility existed; **Missing info** + **Sources** sections added this session |
| 18 | Theme: no arbitrary purple | **IMPLEMENTED AND VERIFIED** | `#8B5CF6` removed from pick page; scanner theme tokens; grep clean under hair-advisor-2 / mobile scan |
| 19 | QR/URL never auto-navigate | **IMPLEMENTED AND VERIFIED** (unit + emit guard) | URL → invalid retail; Digital Link extracts GTIN; camera `emitCode` rejects `url` |
| 20 | Offline UX (not i18n-only) | **IMPLEMENTED AND VERIFIED** (simulated e2e) | Was i18n-only; now `navigator.onLine` + mobile `subscribeNetwork`; Playwright offline test passed |
| 21 | Duplicate API prevention | **IMPLEMENTED AND VERIFIED** (code) | Client dedup window + idempotency keys; backend short inflight cache |
| 22 | Extended formats (DataMatrix, CODE-*, QR live) | **PARTIALLY IMPLEMENTED** | Matrix documents Partial† / image; mobile primary EAN/UPC only |
| 23 | Paid Barcode Lookup / GS1 APIs | **BLOCKED BY EXTERNAL REQUIREMENTS** | Keys unset; OBF + UPCitemdb trial only |
| 24 | Global product coverage | **BLOCKED BY EXTERNAL REQUIREMENTS** | Coverage = verified DB + free/trial providers; many SKUs → not-found → image/OCR |
| 25 | Physical Android/iOS / Safari camera matrix | **NOT IMPLEMENTED** (this session) | Device QA not run; commands documented below |
| 26 | Legacy screen removal / no broken imports | **IMPLEMENTED AND VERIFIED** (repo state) | Legacy Morph/Web scan pages removed in `f0573e39`; no `#8B5CF6` leftovers in pick |
| 27 | Mobile ambiguous product-pick parity | **NOT IMPLEMENTED** | Web routes to `/ingredient/pick/`; mobile stack has **no** pick screen / `product_candidates` handling — ambiguous OCR goes through recover/analyze path only ([Audit mobile scanner](d519c40e-d80d-45bd-8c20-4e4203837aef)) |
| 28 | Abort in-flight HTTP on cancel | **PARTIALLY IMPLEMENTED** | Session ignore works; `abortRef` not passed into `createHairScan` fetch ([Audit web scanner](4e1e1749-eee6-43e8-b670-f530b2214487)) |

### Coverage counts

| Status | Count |
|--------|------:|
| IMPLEMENTED AND VERIFIED | 15 |
| IMPLEMENTED BUT UNTESTED | 4 |
| PARTIALLY IMPLEMENTED | 4 |
| NOT IMPLEMENTED | 2 |
| BROKEN | 0 |
| BLOCKED BY EXTERNAL REQUIREMENTS | 2 |

*Counts recalibrated after parallel audits ([Audit web scanner](4e1e1749-eee6-43e8-b670-f530b2214487), [Audit mobile scanner](d519c40e-d80d-45bd-8c20-4e4203837aef), [Audit backend scanner](ed48fa15-4922-4cf8-9781-69e939965410)) plus this session’s fixes.*

---

## Why the original web scanner often “didn’t work”

| Root cause | Was it real? | Fixed? |
|------------|--------------|--------|
| Camera requires **secure context (HTTPS / localhost)** | Yes — `getUserMedia` blocked on plain HTTP | **Yes** — `diagnoseCameraAccess()` returns `insecure` with i18n message |
| Decoder missing / Safari without BarcodeDetector | Yes — native detector uneven | **Mostly** — ZXing fallback exists; possible double `getUserMedia` on Safari still a residual risk |
| Scan lock / duplicate storm / cancel races | Partially — lock existed; cancel during success timer could restart lookup | **Yes this session** — clear timer + session check before lookup |
| Arbitrary purple UI | Cosmetic, unrelated to camera failure | **Yes** — tokens + remaining pick-page purple removed |
| Product not found ≠ camera broken | User confusion | Documented; not-found panel + image fallback remain |

---

## Bugs found / fixed (this session)

| Bug | Fix |
|-----|-----|
| Cancel during barcode “success” delay could restart API lookup / leave locks inconsistent | `cancelLookup` clears timer; timer checks `sessionRef` before `looking_up` |
| Offline i18n key unused | Wired `navigator.onLine` (web) + `subscribeNetwork` (mobile); block remote lookup |
| Remaining `#8B5CF6` on product pick page | Replaced with neutral `#111` tones |
| Result UI missing “sources” / “missing info” sections | Added without inventing a second Advisor |
| GTIN-14 normalize omitted UPC-A/EAN-13 lookup candidates | Fixed TS + Python normalizers + regression tests |
| Mobile cancel ignored in-flight resolve | Added `sessionRef`; cancel bumps session |
| Camera emit could accept non-retail URL payloads | `emitCode` requires `isValid` and rejects `url` |
| `createHairScan` TypeScript omitted `idempotency_key` | Optional field added to client type (body was already sent) |

---

## Remaining blockers

1. **Physical device QA** (Android Chrome, iOS Safari, Expo Android/iOS) — mandatory before production claim.  
2. **Product catalog coverage** — many retail barcodes will hit not-found without paid providers / richer verified DB.  
3. **Paid barcode APIs** — not configured (intentional).  
4. **Backend live Neon DB** — hybrid recognition Django tests need working `DATABASE_URL`; resolver unit tests use mocks (no Neon).  
5. End-to-end **real barcode → analyze** against API not run here (backend `:8000` down during Playwright; UI tests used demo/auth mocks).  
6. **Mobile product-pick** for ambiguous OCR candidates — parity gap vs web.  
7. **Mobile gallery barcode-first decode** — parity gap vs web ZXing path.  
8. **Safari / ZXing double-`getUserMedia` risk** — camera opens stream then ZXing may open again; watch for “camera busy” on non-BarcodeDetector browsers.

---

## Automated test results

| Command | Result |
|---------|--------|
| `npm run test -w @mybarber/scanner` | **21 passed** |
| `npm run test -w user-web -- --run src/lib/hair-advisor-scanner-logic.test.ts src/lib/hair-advisor-barcode` | **11 passed** |
| `backend/.venv/Scripts/python.exe -m pytest hair_advisor/tests/test_scanner_barcode_normalize.py hair_advisor/tests/test_scanner_product_resolver.py -q` | **17 passed** |
| `npm run test:e2e -- --grep "Universal Smart Scanner"` (apps/user) | **6 passed** (simulated; webServer on `:3000`) |

---

## Browser / native / physical device status

| Surface | Status |
|---------|--------|
| Playwright Chromium (Pixel 7 profile) | Simulated UI **passed**; screenshots saved |
| Real Android Chrome camera | **Not tested** |
| Real iOS Safari camera | **Not tested** |
| Expo Android physical / emulator | **Not tested** |
| Expo iOS physical / simulator | **Not tested** |

### Manual QA commands (when devices available)

```bash
# Web (HTTPS or localhost)
npm run dev:user
# Open /ai-style/care/ingredient — rear camera, EAN-13/UPC pack, torch, leave page (LED off)

# Mobile Expo
npm run dev:mobile
# Android: press `a` or `npx expo start --android`
# iOS: press `i` or `npx expo start --ios`
# Checklist: barcode auto-detect (no shutter), image mode shutter only, cancel mid-lookup, airplane offline banner, gallery, manual code
```

Also use `docs/HAIR_ADVISOR_SCANNER_REAL_DEVICE_QA.md`.

---

## Product lookup coverage notes

- Order: **VerifiedCatalog → Open Beauty Facts → UPCitemdb** (early exit on verified).  
- External hits are **hints only** (`found=False`), never auto-verified.  
- Negative cache (10m) + hint cache (1h) reduce duplicate provider calls.  
- Invalid checksum short-circuits before providers.  
- International GS1 prefixes are **identifier metadata**, not allow/deny gates.  
- Fixtures: `docs/scanner-v2-qa/barcode-fixtures.md` (synthetic checksum-valid GTINs — **not** product claims).

---

## Advisor integration verification

1. Scan create → ingredients draft / confirmed → `confirmHairScanIngredients` / `analyzeHairScan`.  
2. `analyzeScannedProduct` in `advisor-integration.ts` wraps the same pipeline.  
3. Result page maps `recommendation` → qualitative Uzbek labels (`Mos kelishi mumkin`, etc.) — **no invented percentages**.  
4. Profile incomplete → CTA to recover/profile; missing ingredients → recover flow.

---

## Supported format matrix

See **`docs/scanner-v2-capability-matrix.md`**.

Primary live: EAN-13/8, UPC-A/E. Extended via image/ZXing where available. Mobile live: Expo primary types only.

---

## Required credentials

| Credential | Required for |
|------------|--------------|
| Existing Hair Advisor / Gemini (or configured AI) keys | OCR + analysis |
| Auth session (user JWT) | Scan create / history |
| Optional paid barcode API keys | **Not required**; unset by default |
| No client-side provider secrets | By design |

---

## Screenshots

Saved under `docs/scanner-v2-qa/screenshots/`:

- `demo-result-simulated.png` — **simulated** demo result  
- `scanner-chrome-simulated.png` — **simulated** scanner chrome  
- `README.md` — labeling policy  

Physical-device screenshots: **none** (devices unavailable).

---

## Push / deploy note

Local hardening changes are **present in the working tree only**.  
**Not pushed** to `origin/main`. Awaiting **user approval** before commit/push/deploy.

---

## Files changed this QA session

### Modified
- `apps/user/src/hooks/use-smart-scanner.ts`
- `apps/user/src/components/hair-advisor-2/HairAdvisor2ScanPage.tsx`
- `apps/user/src/components/hair-advisor-2/HairAdvisor2ResultPage.tsx`
- `apps/user/src/components/hair-advisor-2/HairAdvisor2ProductPickPage.tsx`
- `apps/user/src/components/ai-style/HairAdvisorBarcodeCamera.tsx`
- `apps/user/src/lib/api/hair-advisor.ts`
- `apps/user/e2e/hair-advisor-scanner.spec.ts`
- `apps/mobile/src/screens/morph/hair-advisor/HairAdvisor2ScanScreen.tsx`
- `apps/mobile/src/i18n/locales/{en,ru,uz}.json`
- `packages/scanner/src/core/barcodeNormalizer.ts`
- `packages/scanner/src/core/barcodeNormalizer.test.ts`
- `backend/hair_advisor/services/scanner/barcode_normalize.py`
- `backend/hair_advisor/tests/test_scanner_barcode_normalize.py`

### Added
- `backend/hair_advisor/tests/test_scanner_product_resolver.py`
- `docs/scanner-v2-production-qa-report.md` (this file)
- `docs/scanner-v2-qa/barcode-fixtures.md`
- `docs/scanner-v2-qa/screenshots/*`
