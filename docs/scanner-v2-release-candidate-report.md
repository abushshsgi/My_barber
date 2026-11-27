# Scanner V2 — Release Candidate Report

**Date:** 2026-11-27  
**Branch:** `feat/scanner-v2-release-candidate`  
**Previous HEAD:** `e9622536`  
**Verdict:** **NOT production-ready.** Physical-device QA is not done.  
**Explicit:** **NOT** merged to `main`. **NOT** deployed to production.

---

## 1. Preview / staging URL

No public preview URL. Production workflows still run only on `main` and were not modified.

| Path | Result |
|------|--------|
| Production hosts | Unchanged. Not deployed. |
| `.github/workflows/preview-user-staging.yml` | Added. Runs only on `workflow_dispatch`, never on `main`. It uploads `apps/user/dist` only when `STAGING_SSH_HOST`, `STAGING_WEB_ROOT`, `STAGING_SSH_USER`, and `STAGING_SSH_KEY` are set, and it refuses `mysaloon.uz` / `api.mysaloon.uz` and the production checkouts. It does not migrate or restart production services. Those variables are not set, so the job does nothing. |
| Local desktop (secure context) | `http://127.0.0.1:3000/ai-style/care/ingredient` — confirmed loading in this session. `npm run dev:user` was left running. |
| Phone browser | `node scripts/dev-https-preview.mjs` after `openssl` is installed. OpenSSL is not on PATH here, so the HTTPS proxy was not started. A LAN `http://` URL will not open the camera. |
| API | Vite proxies `/api/v1` to `http://127.0.0.1:8000`. Do not set `DEV_API_TARGET` or `EXPO_PUBLIC_API_URL` to `https://api.mysaloon.uz` for QA scans. |

Details: `docs/scanner-v2-qa/staging-preview.md`.

---

## 2. Mobile testing commands

Expo Go (SDK 57) is the fastest path. `expo-camera` still-image and live scan are in Expo Go. EAS is not required unless Expo Go rejects the SDK. Firebase and Google Sign-In load only when those flows run.

```bash
cd apps/mobile
# PowerShell. Use this PC's LAN IP. Android emulator: http://10.0.2.2:8000
$env:EXPO_PUBLIC_API_URL = "http://192.168.1.13:8000"
npx expo start
```

The LAN address above was observed for this machine during the session and can change. Start a local API first (`python manage.py runserver 127.0.0.1:8000` from `backend`). Do not leave the default production API in place.

Android emulator or a USB device, only if the Android SDK is installed:

```bash
npx expo start --android
```

This machine has no `adb`, no `java` on PATH, and no `ANDROID_HOME`. A local Android build was not produced.

---

## 3. Expo authentication

`npx eas-cli whoami` → **Not logged in**.

The project owner runs this themselves. Do not send a password or token in chat.

```bash
cd apps/mobile
npx eas-cli login
```

---

## 4. Android build status

**Not built.**

No Android SDK on this machine, and EAS is not logged in. No APK was created and none is linked. Expo Go is the test build.

If Expo Go rejects SDK 57 after login:

```bash
npx eas-cli build -p android --profile development --non-interactive
```

Do not use the `production` or `production-apk` profiles for this QA, and do not submit to Google Play.

---

## 5. iOS build status

**Not built.**

This session is on Windows. There is no local iOS toolchain. EAS is not logged in, and an Apple team is required for a device build. No IPA was created.

On a Mac, or after `npx eas-cli login` with an Apple team:

```bash
cd apps/mobile
npx eas-cli build -p ios --profile development
```

Do not submit to TestFlight or the App Store.

---

## 6. Mobile gallery decoding status

**Implemented in code. Not verified on a device.**

| Platform | Still-image behavior |
|----------|----------------------|
| Android native | `scanFromURLAsync` → ML Kit for `ean13`, `ean8`, `upc_a`, `upc_e`, `code128`, `code39`, `qr`, `datamatrix` when Play Services exist. Not PDF417 or Aztec. |
| iOS native | `scanFromURLAsync` is QR only. `CameraViewModule.swift` uses `CIDetectorTypeQRCode` and ignores the requested type list. |
| Both | JPEG is re-encoded with `expo-image-manipulator` so EXIF orientation is baked in. `@zxing/library` then tries EAN-13/8, UPC-A/E, CODE-128, and QR at 0/90/180/270 degrees. |
| Miss | If there is no checksum-valid retail GTIN, the existing `createHairScan` image call runs only when the user is online and has an access token. Otherwise the UI stays on the device. |

A local hit calls the existing `processBarcode` path (`input_method: barcode`), which is the shared validator and product resolver. It does not open a second pipeline.

Automated proof is a synthetic JPEG round-trip (drawn EAN-13, including a 90° rotation) plus a QR that is only a URL, which is rejected. That is not a photo of a retail pack.

---

## 7. Automated tests

| Command | Result |
|---------|--------|
| `npm run test -w @mybarber/scanner` | **38 passed** (was 21) |
| `npm run test -w user-web -- --run src/lib/hair-advisor-scanner-logic.test.ts src/lib/hair-advisor-barcode-decode.test.ts` | **11 passed** |
| `backend/.venv` pytest `test_scanner_barcode_normalize.py` `test_scanner_product_resolver.py` | **18 passed** (was 17) |
| `npm run test:e2e -- --grep "Universal Smart Scanner"` | **9 passed** (mocked UI; local user server was up) |

**76 passed** in this session. No physical-device test is included.

---

## 8. Real-device testing procedure

Follow `docs/scanner-v2-qa/physical-device-qa.md` and fill `docs/scanner-v2-qa/real-product-qa.md`.

Categories to record separately: shampoo, conditioner, hair mask, hair serum, hair oil, other cosmetic. For each: barcode detected, format, validation, latency, product found, identity correct, ingredients available, advisor success, result UI. A valid barcode with “product not found” is a catalog miss, not a decode failure.

There is no country allowlist. Checksum-valid GTINs are accepted regardless of GS1 prefix. That is covered by the scanner and backend normalizer tests. It is not a claim that every retail SKU is in the catalog.

Development builds show a **QA** button on the scanner. The copied report has platform, permission, camera readiness, decoder readiness, formats, redacted barcode, validation, lock, lookup, provider, advisor, latency, decode path, and a redacted error. Production builds hide it (`__DEV__` is false and `EXPO_PUBLIC_SCANNER_DIAGNOSTICS` is not set on the production EAS profiles).

**Physical-device QA: not completed.** No phone or emulator was attached.

---

## 9. Remaining blockers

| Item | Status |
|------|--------|
| Physical camera / gallery / torch / LED-off | Not done. Owner device pass. |
| Public staging URL | Not configured. Staging GitHub variables are absent. |
| Android APK / iOS IPA | Not built. EAS logged out. No Android SDK. No Apple toolchain on this PC. |
| Paid Barcode Lookup / GS1 | Not wired. No purchase. Scanner works without them. See `docs/scanner-v2-qa/product-providers.md`. |
| Global SKU coverage | Limited to the verified catalog plus Open Beauty Facts and the UPCitemdb trial. |
| Real product matrix | Blank on purpose. |

---

## 10. Files modified

Code:

- `packages/scanner/src/core/galleryPlan.ts`
- `packages/scanner/src/core/scannerDiagnostics.ts`
- `packages/scanner/src/gallery/decodeJpeg.ts`
- `packages/scanner/src/core/galleryPlan.test.ts`
- `packages/scanner/src/gallery/decodeJpeg.test.ts`
- `packages/scanner/package.json`
- `packages/scanner/src/core/index.ts`
- `apps/mobile/src/lib/gallery-barcode.ts`
- `apps/mobile/src/lib/product-label.ts`
- `apps/mobile/src/components/scanner/ScannerDiagnosticsSheet.tsx`
- `apps/mobile/src/screens/morph/hair-advisor/HairAdvisor2ScanScreen.tsx`
- `apps/mobile/metro.config.js`
- `apps/mobile/package.json`
- `backend/hair_advisor/tests/test_scanner_product_resolver.py`

Delivery:

- `.github/workflows/preview-user-staging.yml`
- `scripts/dev-https-preview.mjs`
- `docs/scanner-v2-qa/staging-preview.md`
- `docs/scanner-v2-qa/product-providers.md`
- `docs/scanner-v2-qa/real-product-qa.md`
- `docs/scanner-v2-qa/physical-device-qa.md`
- `docs/scanner-v2-capability-matrix.md`
- `docs/scanner-v2-qa/screenshots/` (new local captures)
- lockfiles updated by the dependency installs

Production deploy workflows were not edited.

---

## 11. Screenshots

Path: `docs/scanner-v2-qa/screenshots/`

| File | What it is |
|------|------------|
| `desktop-scanner-local.png` | Local desktop scanner. Camera permission denied in this browser. |
| `mobile-web-scanner-local.png` | 390px layout of the same page. |
| `mobile-web-offline-local.png` | Offline banner after `navigator.onLine = false`. |
| `demo-advisor-result-local.png` | Existing demo fixture result, not a scanned product. |
| `demo-result-sources-local.png` | Demo sources / INCI / advisor copy. |
| `*-simulated.png` | Earlier Playwright UI captures. Still simulated. |

Not captured: native Expo scanner, gallery decode of a real photo, product-not-found from a real barcode, scan history from a real account.

---

## 12. Commit

Recorded after the commit on `feat/scanner-v2-release-candidate`. Not merged. Not production-deployed.

---

## 13. Safety

- [x] Not merged to `main`
- [x] Not production deployed
- [x] No force-push intended
- [x] No invented store or APK links
- [x] No paid subscription purchased
- [x] No production database writes from this session
- [x] Physical-device QA not marked complete
