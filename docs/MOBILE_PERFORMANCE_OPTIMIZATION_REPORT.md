# Mobile performance optimization report

## Changes implemented (apps/user)

| File | Change |
|------|--------|
| `src/lib/morph-lcp-shell.server.ts` | Server injects try-on static LCP **only** for `/ai-style` |
| `src/server.ts` | Wire morph LCP injection after SEO inject |
| `src/routes/__root.tsx` | Remove global hero preload, static `<img>`, and LCP CSS from shell |
| `src/routes/index.tsx` | Remove erroneous try-on preload; lazy `HomeDesktopRoot`; move `useHomeData` to desktop-only branch |
| `src/components/UserLayout.tsx` | Lazy-load `ScrollToTopIndicator` on large screens only |
| `src/components/mobile/MobileDockNav.tsx` | Defer route preloads to `requestIdleCallback`; scope to active shell |
| `vite.config.ts` | Split vendors: lucide, radix, tanstack query/router, i18n, zxing, google oauth |
| `src/lib/morph-lcp-shell.server.test.ts` | Regression test for pathname-gated injection |

## Local build impact

| Chunk | Before | After |
|-------|--------|-------|
| Main `index-*.js` | 832 KB | **418 KB** (~50% smaller) |
| `vendor-zxing` | (in main tree) | **406 KB** (lazy chunk) |
| `vendor-motion` | 138 KB | **130 KB** (not loaded on mobile scroll-top path) |

## Expected user-visible effects

- **Homepage / non–try-on routes**: No try-on WebP download; faster FCP/LCP in lab.
- **Mobile home**: No salon/barber/hairstyle API burst until desktop breakpoint.
- **Dock**: Less background JS parse during first seconds; scanner chunk loads on intent/idle.
- **`/ai-style`**: Static LCP hero preserved via server injection + existing route preload.

## Not in this pass

- Full route SSR for home (large TanStack Start change).
- Backend media Redis / Nginx edge cache (see `docs/PERFORMANCE_BASELINE.md`).
- Replacing all Framer Motion usage site-wide.
- Guarantee PSI Mobile **95+** (lab still hydration-bound).

## Rollback

Revert commit deploying these files; no migrations. Previous global shell LCP returns immediately if `__root.tsx` + `server.ts` morph injection are reverted.