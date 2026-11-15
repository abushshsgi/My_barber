# MySaloon — Performance optimization master report

**Date:** 2026-11-15  
**Scope:** `Mybarber/apps/user` (production frontend)  
**Status:** Implemented locally, **not deployed** (operator approval required).

---

## Root causes identified

| Area | Cause |
|------|--------|
| **Initial JS** | ~1.14 MiB main chunk: all locales, Firebase push, onboarding + Framer Motion, AI API helpers, and root widgets on every route. |
| **LCP** | Hero image only appeared after React + route chunk; spa shell hid image from preload scanner; 720/864w default on narrow viewports. |
| **CSS/fonts** | Render-blocking global CSS; font `woff2` discovered only after font-face stylesheet (1.57s critical chain on PSI). |
| **Third-party** | gtag loaded during early main-thread window (now after `load` + idle). |
| **Router** | `defaultPreload: "intent"` pulled adjacent route JS on hover/focus (wasted on mobile cold starts). |
| **i18n** | uz + ru + en (~295 KiB JSON) bundled in main entry. |

---

## Optimizations completed

### JavaScript & routing
- TanStack **auto code splitting** (routes → lazy chunks: auth, map, wallet, AI chat/care, etc.).
- **`DeferredClientWidgets`**: lazy first-visit onboarding, GA, Firebase init, telemetry, deploy recovery.
- **Dynamic import** for Firebase messaging, AI history refresh, push unregister.
- **`manualChunks`**: firebase, framer-motion, mediapipe, three, recharts.
- **`defaultPreload: false`** on router (no intent preloading on cold mobile loads).
- **Lazy `sonner` Toaster** in root shell.

### i18n
- **uz** bundled; **ru/en** loaded via `import()` on language switch / stored preference (`ensureLanguageResources`).

### LCP
- Static morph hero `<img>` in `RootShell` (morph paths only via `data-morph-lcp`).
- Responsive preload with `imagesrcset` / `imageSizes` in shell (not global head).
- Default mobile src/preload **480w** WebP; `TryOnHeroImage` removes static placeholder on mount.

### Images / icons
- Dock Mysaloon icon: **`/favicon-32.png`** @ 32×32 (was `icon-192.png`).
- Onboarding universal slide: **`loading="eager"`** + `fetchPriority="high"` when shown.

### CSS & fonts
- Preload hashed **Space Grotesk latin woff2** before stylesheet.
- `font-display: swap` (via @fontsource).

### Firebase, GA, realtime
- Firebase app/messaging **lazy**; init in deferred chunk.
- GA after **`window.load`** then `requestIdleCallback` (5s cap).
- Notifications WebSocket after **`window.load`**.

### Tooling & ops
- `npm run build:analyze` → `dist/bundle-stats.html`.
- Nginx optional Brotli/static notes: `deploy/vps/nginx/PERFORMANCE_SNIPPETS.md`.

---

## Modified files (this optimization pass)

| File | Change |
|------|--------|
| `src/i18n/config.ts` | Lazy ru/en locales |
| `src/components/I18nProvider.tsx` | `ensureLanguageResources` on boot |
| `src/router.tsx` | `defaultPreload: false` |
| `src/routes/__root.tsx` | LCP shell, font preload, lazy Toaster, removed global hero preload |
| `src/lib/try-on-hero-assets.ts` | *(Phase 2)* hero constants |
| `src/components/DeferredClientWidgets.tsx` | *(Phase 2)* |
| `src/components/ai-style/TryOnHeroImage.tsx` | *(Phase 2)* |
| `src/components/GoogleAnalytics.tsx` | load + idle scheduling |
| `src/components/AuthSessionGuard.tsx` | deferred WS + dynamic API imports |
| `src/lib/auth.ts`, `lib/native-push.ts`, `FirebaseInit.tsx` | *(Phase 2)* lazy Firebase |
| `src/hooks/use-notifications-websocket.ts` | `enabled` flag |
| `src/components/first-visit/UniversalSlide.tsx` | eager LCP for slide 1 |
| `src/components/mobile/MobileDockNav.tsx` | favicon dock icon |
| `vite.config.ts` | chunks, router, budget warning |
| `package.json` | `build:analyze` script |
| `docs/PERFORMANCE_PHASE2.md` | Phase 2 notes |
| `deploy/vps/nginx/PERFORMANCE_SNIPPETS.md` | Nginx guidance |

---

## Bundle size (production build, local)

| Metric | Before (PSI / pre-work build) | After (2026-11-15 build) |
|--------|-------------------------------|---------------------------|
| Main entry JS | **~1,139 KiB** (PSI) / 1,199 KiB build | **819 KiB** (gzip **262**) |
| `/ai-style` route JS | ~194 KiB | **63 KiB** (+ vendor-motion on demand) |
| ru/en i18n | in main | **async chunks** (e.g. `ru-*.js`) |
| Firebase | in main | **52 KiB** vendor chunk (on demand) |

**Initial `/ai-style` cold path (approximate):** main ~819 KiB + ai-style ~63 KiB + CSS ~40 KiB + hero WebP ~60–90 KiB (not counted as JS). Heavy AI (mediapipe 131 KiB) loads only when try-on/face pipeline runs.

Open **`apps/user/dist/bundle-stats.html`** for treemap after `npm run build:analyze`.

---

## Core Web Vitals

| Metric | PSI baseline (prod mobile) | Local Lighthouse (post-change, *not prod*) | Target |
|--------|----------------------------|--------------------------------------------|--------|
| Performance | 54 | ~46 (localhost, incomplete CDN) | 90+ |
| FCP | 7.2s | ~2.4s local | <1.8s |
| LCP | 10.2s | unreliable locally | <2.5s |
| TBT | 100ms | varies | <150ms |
| CLS | 0 | 0 | <0.1 |
| Speed Index | 7.6s | ~3.6s local | <3.4s |

**Authoritative comparison:** re-run [PageSpeed Insights](https://pagespeed.web.dev/) on `https://mysaloon.uz/ai-style` after deploy.

---

## Tests

| Suite | Result |
|-------|--------|
| `npm test` (Vitest) | **52/52 passed** |
| `npm run build` | **Success** |
| `npm run lint` | Pre-existing repo-wide ESLint/Prettier debt (not introduced by this work) |

---

## Remaining limitations

- Main entry **~819 KiB** still includes React, TanStack Router/Query, Radix used by layout, and uz locale — further reduction needs deeper UI/component splits without UX regressions.
- **90+ mobile PSI** may require CDN/HTTP tuning, VPS Brotli, and deployed hero assets; not proven until post-deploy PSI.
- Users with **ru/en** stored language see a brief async locale fetch on first paint (no missing keys once loaded).
- **LazyMotion** migration not done globally (visual parity risk).
- Django/API latency and HTTP/1.1 edge cases are outside frontend bundle scope.

---

## Production deployment instructions

**Do not deploy without approval.**

```bash
cd Mybarber/apps/user
npm ci
npm test
npm run build
# Optional treemap:
npm run build:analyze

# Deploy dist/ using your existing Nitro/node-server + systemd playbook.
# Optional: merge deploy/vps/nginx/PERFORMANCE_SNIPPETS.md into mysaloon-user.conf, then:
#   sudo nginx -t && sudo systemctl reload nginx
```

**Post-deploy checklist**
1. PSI mobile: `/` redirect and `/ai-style`.
2. View-source: `morph-lcp-static` + hero preload on morph URLs.
3. Network: hero `480.webp`, fonts from preload, `/assets/*` immutable cache.
4. Smoke: onboarding slides, auth (phone + Google), try-on, chat, Payme **sandbox only**, language switch ru/en.
5. GA Realtime: first `page_view` within ~5s of load.

---

## Performance budgets (monitoring)

| Budget | Threshold |
|--------|-----------|
| Main entry (gzip) | ≤ 280 KiB (current ~262) |
| Route chunk (gzip) | ≤ 20 KiB per landing route where possible |
| LCP image transfer | ≤ 120 KiB mobile |
| TBT | < 150ms |
| CLS | < 0.1 |

Regenerate `bundle-stats.html` each release and compare main entry hash/size.