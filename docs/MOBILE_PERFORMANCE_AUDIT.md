# Mobile performance audit summary

## Why the site felt slow on mobile

1. **Wrong LCP resource on most URLs** — Try-on hero image was injected in the global HTML shell with `fetchPriority="high"` and `rel=preload` on every path. Lighthouse still downloaded it on `/`, inflating LCP and FCP.
2. **Oversized initial JavaScript** — Single `index` chunk ~832 KB gzip-adjacent raw; dock preloaded heavy Morf routes (ingredient scanner + ZXing) immediately after first paint.
3. **Home API waterfall on mobile** — `useHomeData()` ran even when mobile UI only showed `MysaloonPausedScreen`, firing salons/barbers/hairstyles queries.
4. **Framer Motion on all viewports** — `ScrollToTopIndicator` (desktop-only UI) eagerly imported `framer-motion` on every mobile page.
5. **Render path** — App routes use `ssr: false`; first meaningful paint waits on JS download + hydration (structural limit for FCP until further SSR work).

## PSI / Lighthouse findings mapped to code

| Audit | Root cause in repo |
|-------|-------------------|
| Unused JavaScript (~783 KiB) | Eager route preload + fat main chunk; ZXing/Mediapipe on non-scanner routes via preload |
| Render-blocking CSS | `styles.css` in root head (expected); hero preload worsened priority |
| Forced reflow | `ScrollToTopIndicator`, `MaintenanceBanner`, map sheets (known; not all fixed this pass) |
| Long tasks (4) | Main-thread parse/eval of 800 KB+ JS |
| Network dependency tree | Parallel API fan-out from `useHomeData` on mobile home |

## Unchanged (per requirements)

- UI/UX layout, SEO registry, auth/booking/payment/Morf features.
- CLS kept near 0; accessibility/SEO configs untouched.