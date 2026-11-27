# Scanner V2 — Owner Physical Device QA

**Branch:** `feat/scanner-v2-release-candidate`  
**Purpose:** Mandatory real-device camera / barcode validation before any production claim.  
**Automated e2e does NOT replace this checklist.**

---

## Prep

### Web
```bash
# Local (secure context = localhost OK)
npm run dev:user
# Open https://localhost… or http://127.0.0.1:3000/ai-style/care/ingredient
```
Or staging/prod HTTPS host if available — **plain HTTP on LAN IP will fail camera**.

### Mobile (Expo)
```bash
cd apps/mobile
npm run start
# Android: press `a` or `npx expo start --android`
# iOS: press `i` or `npx expo start --ios`
```
Dev client / preview build preferred over Expo Go if native camera modules differ.

### Test materials
- Real retail packs: EAN-13, EAN-8, UPC-A (and UPC-E if available)
- Damaged / wrinkled barcode
- QR with URL (must **not** open browser / navigate)
- GS1 Digital Link sticker if available (GTIN extract only)
- Airplane mode / Wi‑Fi off for offline UX

---

## Matrix (fill Pass / Fail / N/A)

| # | Scenario | Android Chrome | iOS Safari | Expo Android | Expo iOS | Notes |
|---|----------|----------------|------------|--------------|----------|-------|
| 1 | Camera permission grant / deny / re-ask | | | | | |
| 2 | Secure-context gate (HTTP LAN fails; HTTPS/localhost OK) | | | | | Web only |
| 3 | Live EAN-13 auto-detect (no shutter) | | | | | |
| 4 | Live UPC-A / EAN-8 | | | | | |
| 5 | Torch / flashlight toggle | | | | | |
| 6 | Leave page / blur — camera LED off | | | | | |
| 7 | Mode switch Barcode ↔ Image | | | | | |
| 8 | Image mode shutter only (barcode mode no shutter) | | | | | |
| 9 | Gallery: web barcode-first decode; mobile image upload | | | | | |
| 10 | Manual barcode entry (valid + invalid checksum) | | | | | |
| 11 | Duplicate scan dedup (same code rapid fire) | | | | | |
| 12 | Cancel mid-lookup (no stale navigation) | | | | | |
| 13 | Offline banner / block remote lookup | | | | | |
| 14 | Product found → Advisor result (qualitative labels only; no fake %) | | | | | |
| 15 | Product not found → recover / image path | | | | | |
| 16 | Ambiguous OCR → product pick (web + mobile) | | | | | |
| 17 | History list opens | | | | | |
| 18 | QR/URL never auto-navigates | | | | | |

---

## Sanitized diagnostic logs (no PII)

When filing a fail, collect:

1. **Device:** OS version, browser/app build, network (Wi‑Fi/cellular).  
2. **Barcode shape only:** length + format guess (e.g. `EAN-13, 13 digits`) — **do not** paste full customer barcodes into public channels if avoidable; if needed, redact middle digits (`590***3457`).  
3. **UI phase:** permission / scanning / detected / looking_up / not_found / error / offline.  
4. **Console (web):** filter to `scanner`, `BarcodeDetector`, `getUserMedia`, `AbortError` — strip auth tokens / Authorization headers.  
5. **Network:** status codes for `/api/v1/hair-advisor/scans/` only (200/4xx/5xx) — **no** JWT bodies.  
6. **Screenshot** of UI state (blur faces / personal data if any).

### Redaction checklist
- [ ] No phone numbers, names, emails  
- [ ] No access/refresh tokens  
- [ ] No full payment / address data  
- [ ] Barcodes truncated or synthetic fixtures preferred (`docs/scanner-v2-qa/barcode-fixtures.md`)

---

## Sign-off

| Role | Name | Date | Verdict |
|------|------|------|---------|
| Owner QA | | | Ready for merge review / Needs fixes |

**Production deploy is forbidden until this matrix is completed and owner approves.**
