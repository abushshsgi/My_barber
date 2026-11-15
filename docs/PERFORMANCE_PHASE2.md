# Phase 2 — Mobile performance (2026-11-15)

## Production bundle comparison (local `npm run build`)

| Asset | Before | After |
|-------|--------|-------|
| Main entry `index-*.js` | **1,198.7 KiB** (gzip 383) | **982.7 KiB** (gzip 314) |
| Route `/ai-style` chunk | 193.8 KiB | **62.8 KiB** + lazy `vendor-motion` 141 KiB (on demand) |
| Firebase SDK | in main | **`vendor-firebase` 52 KiB** (on demand) |
| First-visit onboarding | in main | **lazy** (`first-visit-onboarding` + `vendor-motion`) |

Route-level code splitting was already active via TanStack Start; this pass removes heavy imports from the **critical path** (root shell, auth guard, push, onboarding).

## Changes (by priority)

### JavaScript
- `DeferredClientWidgets` — lazy onboarding, GA, Firebase, telemetry, deploy recovery (no longer in main chunk).
- Dynamic `import()` for Firebase push, `refreshAiStyleHistoryCache`, and `unregisterPushToken`.
- `vite.config.ts` — explicit `router.autoCodeSplitting` + `manualChunks` for firebase, framer-motion, mediapipe, three, recharts.

### LCP (`try-on-selfie-hero`)
- `lib/try-on-hero-assets.ts` — shared preload URL, responsive `srcset`, morph path boot script.
- **Static `<img>` in `RootShell`** for `/`, `/ai-style` (discoverable in first HTML; removed when `TryOnHeroImage` mounts).
- Responsive image preload: `imagesrcset` / `imageSizes` on `<link rel="preload">`.
- Mobile fallback `src` / preload default: **480w** WebP (was 720w).

### CSS / fonts
- Preload hashed **Space Grotesk latin** `woff2` before stylesheet chain (breaks CSS → font serial dependency).

### Dock icon
- Mysaloon toggle uses **`/favicon-32.png`** (32×32) instead of `/icon-192.png` in the dock (PWA `icon-192` unchanged for manifest).

### Google Analytics
- Still idle-loaded; timeout increased slightly (2s / 4s idle) so gtag competes less with first paint.

## Verification

**Do not treat local Lighthouse as prod score** (CPU throttling, no CDN, different HTTP stack). After deploy to `mysaloon.uz`:

1. PageSpeed Insights — mobile, `/ai-style` (compare FCP, LCP, TBT, SI).
2. DevTools → Network: hero `480.webp` from preload, no duplicate full-size 864 unless viewport requires it.
3. View source: `id="morph-lcp-static"` present on morph paths.
4. Functional smoke: onboarding, auth, try-on upload, dock morph/mysaloon switch, GA Realtime page_view within ~4s.

### Deploy (no production push from this doc — operator approval required)

```bash
cd Mybarber/apps/user
npm run build
# deploy dist/ per existing VPS / Nitro playbook (reload nginx if config changed)
```

Baseline mobile PSI (pre-deploy, 2026-11-15): FCP 7.2s, LCP 10.2s, TBT 100ms, SI 7.6s, CLS 0.

**Target:** mobile Performance 90+ after deploy + re-measure on PSI.