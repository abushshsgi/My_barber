# Mobile performance baseline (pre-optimization)

Captured **2026-11-26** on production `https://mysaloon.uz/` before this optimization deploy.

## Google PageSpeed Insights (Mobile)

| Metric | Value |
|--------|-------|
| Performance | **58** |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |
| FCP | 5.9 s |
| LCP | 9.1 s |
| Speed Index | 5.9 s |
| TBT | 170 ms |
| CLS | 0 |

## Lighthouse CLI (Mobile emulation, lab)

Homepage `/` (same production build as PSI snapshot):

| Metric | Value |
|--------|-------|
| Performance | 48 |
| FCP | 5.7 s |
| LCP | 8.8 s |
| TBT | 480 ms |
| CLS | 0.067 |

## Confirmed HTML issues (homepage)

- `morph-lcp-static` try-on hero **preload + `<img>` on every route**, including `/` (hidden via CSS but still downloaded).
- Homepage route also preloaded try-on WebP in `index.tsx` head (removed in optimization).
- Main JS chunk **~832 KiB** (post-split baseline build).
- Mobile dock **eagerly preloaded all tab routes** (including heavy `/ai-style/care/ingredient` chunk) on mount.

## Primary LCP breakdown (homepage, inferred)

| Phase | Cause |
|-------|--------|
| TTFB | Nitro SSR + HTML stream |
| Resource load delay | Try-on hero high-priority preload competing with JS/CSS |
| Resource load duration | try-on WebP + large initial JS graph |
| Element render delay | Client-only SSR (`ssr: false`); React hydration before meaningful paint |

## Bundle (Vite production, pre-change)

| Chunk | ~Size |
|-------|-------|
| `index-*.js` | 832 KB |
| `vendor-motion` | 138 KB |
| `ai-style_.care_.ingredient` | 405 KB |

## Notes

- CrUX field data lags lab deploys by days/weeks.
- Default mobile shell redirects `/` → `/ai-style` after hydration; PSI still measures initial `/` HTML.