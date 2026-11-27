# Scanner V2 — Release Candidate Report

**Date:** 2026-11-27  
**Branch:** `feat/scanner-v2-release-candidate`  
**Base:** `f0573e39` (Universal Smart Scanner V2 on Hair Advisor)  
**RC commits:**
- `20fd4275` — `fix(scanner): harden universal scanner v2 and advisor integration`
- `be29ed88` — `fix(scanner): close RC gaps for abort, mobile pick, and QA docs`  
**Verdict:** **NOT production-ready** — awaiting owner physical-device QA approval.  
**Explicit:** **NOT** merged to `main`. **NOT** deployed to production.

---

## 1. Executive summary

Local Scanner V2 hardening was verified with unit/e2e tests, committed, and pushed only to `feat/scanner-v2-release-candidate`. Remaining code-only gaps closed where feasible (HTTP abort, mobile product-pick parity, result Sources/Missing sections, capability matrix honesty). Physical camera QA, paid barcode APIs, global SKU coverage, staging frontend for this branch, and EAS mobile binaries remain open/blocked.

---

## 2. Branch / push

| Item | Value |
|------|--------|
| Branch | `feat/scanner-v2-release-candidate` |
| Remote | `https://github.com/abushshsgi/My_barber` |
| PR draft URL | https://github.com/abushshsgi/My_barber/pull/new/feat/scanner-v2-release-candidate |
| Force-push | **No** |
| Merged to main | **No** |

---

## 3. Tests re-run (this RC session)

| Command | Result |
|---------|--------|
| `npm run test -w @mybarber/scanner` | **21 passed** |
| `npm run test -w user-web -- --run src/lib/hair-advisor-scanner-logic.test.ts src/lib/hair-advisor-barcode-decode.test.ts` | **11 passed** |
| `backend/.venv … pytest …test_scanner_barcode_normalize.py …test_scanner_product_resolver.py` | **17 passed** |
| `npm run test:e2e -- --grep "Universal Smart Scanner"` (apps/user) | **9 passed** (simulated; backend `:8000` down — UI mocks/demo only) |

---

## 4. Gaps closed vs still open

### Closed / improved in RC (code)

| Requirement | Was | Now |
|-------------|-----|-----|
| #17 Result UI missing info + sources | Partial (web only) | Web + **mobile** result sections |
| #20 Offline UX | Wired prior session | Confirmed web + mobile; e2e offline |
| #22 Extended formats docs vs code | Partial / optimistic matrix | Matrix rewritten to **code truth** |
| #27 Mobile ambiguous product-pick | NOT IMPLEMENTED | **IMPLEMENTED** (stack + screen + routing) — **UNTESTED** on device |
| #28 Abort in-flight HTTP on cancel | Session ignore only | `AbortSignal` passed into `createHairScan` (web + mobile) |

### Still open (honest)

| Requirement | Status | Root cause / blocker |
|-------------|--------|----------------------|
| #3 Web live decode (physical) | IMPLEMENTED BUT UNTESTED | No Android Chrome / Safari device in session |
| #6 Camera cleanup LED | IMPLEMENTED BUT UNTESTED | Needs physical observe |
| #7 Mobile Expo live scan | IMPLEMENTED BUT UNTESTED | No emulator/device run |
| #8 Mobile checksum/dedup/cancel on device | IMPLEMENTED BUT UNTESTED | Device QA |
| #10 Gallery + manual | PARTIAL | Web ZXing OK; **mobile gallery still server image path** (no client decode lib) |
| #22 Extended live formats | PARTIAL | Primary EAN/UPC (+ web CODE-128 BD); others not primary |
| #23 Paid Barcode Lookup / GS1 | BLOCKED | Keys unset (intentional) |
| #24 Global product coverage | BLOCKED | Verified DB + free/trial providers only |
| #25 Physical device matrix | NOT DONE | Owner must run `docs/scanner-v2-qa/physical-device-qa.md` |

### Per-gap detail template (remaining)

#### #3 Web live decode
- **Current:** BarcodeDetector + ZXing in `HairAdvisorBarcodeCamera.tsx`
- **Missing:** Physical pass evidence
- **Owner:** Device QA script

#### #6 Camera cleanup
- **Current:** Track stop on unmount / mobile `useIsFocused`
- **Missing:** LED-off confirmation
- **Owner:** Device QA

#### #7 / #8 Mobile live + cancel
- **Current:** Expo CameraView + session/abort
- **Missing:** Device evidence
- **Owner:** Device QA

#### #10 Mobile gallery barcode-first
- **Current:** Status copy notes server fallback
- **Missing:** Client ZXing/wasm decode dependency
- **Proposed fix (future):** Add RN-safe image barcode decode or accept server-only
- **External?** No — product choice

#### #23 / #24 Providers & coverage
- **External blocker:** Paid API keys / catalog enrichment

#### #25 Physical matrix
- **Doc:** `docs/scanner-v2-qa/physical-device-qa.md`

---

## 5. Staging deploy

| Check | Evidence |
|-------|----------|
| Frontend deploy workflow | `.github/workflows/deploy-frontends-vps.yml` triggers on **`main` only** |
| Production hosts | `www.mysaloon.uz` / `api.mysaloon.uz` (prod paths) |
| Hair staging DB scripts | `backend/deploy/vps/*staging*` exist historically |
| RC branch staging URL | **Not deployed** |

**Blocker:** No CI path deploys feature branches to an isolated staging frontend. Deploying this RC to VPS prod hosts would violate “no production deploy”.

**Exact commands if owner wants a dedicated staging later (not run):**
```bash
# After provisioning a non-prod host + env:
git checkout feat/scanner-v2-release-candidate
# build user-web against staging API base
npm run build:user
# rsync/nginx to STAGING host only — never /opt/mysaloon production without approval
```

### Config evidence (not invented runtime)

| Item | Evidence |
|------|----------|
| HTTPS / SSL redirect (Django when not DEBUG) | `SECURE_SSL_REDIRECT`, HSTS in `backend/config/settings.py` |
| CORS allowlist | `CORS_ALLOWED_ORIGINS` / `FRONTEND_*` builders; `CORS_ALLOW_ALL_ORIGINS = DEBUG` |
| Proxy SSL header | `SECURE_PROXY_SSL_HEADER = X-Forwarded-Proto` |
| Camera secure context | Client `diagnoseCameraAccess` / `isSecureContext` (prior QA) |

---

## 6. Mobile builds (EAS)

| Item | Status |
|------|--------|
| `apps/mobile/eas.json` | `development` / `preview` (internal APK) / `production` |
| `app.config.ts` | `expo-camera` permissions present |
| `eas whoami` | **Not logged in** |
| Android internal/dev build | **Not started** |
| iOS build | **Blocked** — Apple credentials + EAS login required |
| APK/IPA download links | **None invented** |

**Commands for owner (when logged in):**
```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build -p android --profile preview --non-interactive
# iOS (requires Apple team / certs):
npx eas-cli build -p ios --profile preview
```

---

## 7. Screenshots

Path: `docs/scanner-v2-qa/screenshots/`

| File | Notes |
|------|--------|
| `demo-result-simulated.png` | Simulated |
| `scanner-chrome-simulated.png` | Simulated |
| `manual-entry-simulated.png` | Simulated |
| `offline-mobile-viewport-simulated.png` | Simulated |
| `result-sources-desktop-simulated.png` | Simulated |
| `mode-image-simulated.png` | Simulated |
| Native Expo / physical camera | **Missing** |

---

## 8. Owner manual QA

Follow **`docs/scanner-v2-qa/physical-device-qa.md`**.  
Prior report: `docs/scanner-v2-production-qa-report.md`.

---

## 9. Updated coverage counts (RC)

| Status | Count |
|--------|------:|
| IMPLEMENTED AND VERIFIED (automated / code) | ~17 |
| IMPLEMENTED BUT UNTESTED (physical) | 4 (+ mobile pick device) |
| PARTIALLY IMPLEMENTED | 2 (#10 gallery mobile, #22 extended) |
| NOT DONE this session | 1 (#25 physical matrix) |
| BLOCKED BY EXTERNAL | 2 (#23, #24) |
| BROKEN | 0 |

**Production readiness: NOT READY** until physical QA signed off and owner approves merge/deploy.

---

## 10. Safety attestation

- [x] Not merged to `main`
- [x] Not production deployed
- [x] No force-push
- [x] No invented store/APK links
- [x] Unrelated untracked junk (`apps/user/android`, eslint-out, sqlite, tmp-hairstyles, lighthouse) left unstaged
