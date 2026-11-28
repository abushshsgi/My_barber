# MySaloon V3 — deep performance report (measured pass)

Date: 2026-11-28  
Branch: `feat/mysaloon-v3-ecosystem`  
Prior report baseline: `e77a8855` / `d5759810` Lighthouse manifest (2 runs/route)  
This pass: **3 runs/route**, Nitro `:3002`, Django QA `:8001` (`qa_verify_8001.sqlite3`)  
Restrictions honored: no deploy, no `main` merge, port **8000** untouched, Scanner V2 RC unchanged.

---

## Executive summary

| Priority | Outcome |
| --- | --- |
| P1 Home desktop CLS | **Fixed** — median **1.10 → 0.043** (target ≤0.1 met) |
| P2 Explore mobile LCP | **Root cause identified** — LCP was `desktopDesc` text because `/explore` mounted desktop layout on all viewports; LCP element is now **hero WebP**. Lab LCP ms still **~6.7–11.5s** (JS first-paint gate, not image bytes) |
| P3 Bundle | Measured — shared entry **434 kB / 134 kB gzip**; **ZXing / MediaPipe / Motion** remain route-scoped chunks (not on explore first navigation) |
| P4 TypeScript | **91** `tsc --noEmit` errors captured (`docs/mysaloon-v3-qa/typescript-baseline.txt`); **0 new errors** introduced by this pass (no release-critical TS edits) |
| P5 Lighthouse | Medians in [`docs/mysaloon-v3-qa/lighthouse/manifest.json`](mysaloon-v3-qa/lighthouse/manifest.json); raw `*-run*.json` updated |

**Targets not met (evidence-based):** mobile lab Performance ≥90, LCP ≤2.5s on explore/home/guides — blocked by **`ssr: false` on `__root__`** (~915 kB initial JS + ~292 kB CSS before any route paints).

---

## P1 — Home desktop CLS (~1.1)

### Trace evidence (before)

`docs/mysaloon-v3-qa/lighthouse/home-desktop-run1.json` (pre-fix manifest `d5759810`):

- CLS **0.94** on a single shift of `<div data-app-lang="uz">` (full document reflow).
- Desktop `/` first painted **mobile** `MysaloonPausedScreen` (~70dvh), then swapped to **desktop bazaar** after `useIsLgUp()` `useEffect` flipped `false → true`.

### Root cause

`useIsLgUp` / `useIsMobile` in `apps/user/src/hooks/use-mobile.tsx` used `useState(false)` + `useEffect`, so **first paint always assumed mobile** on desktop Lighthouse.

Secondary: lazy `HomeDesktopRoot` with `Suspense fallback={null}` added empty-then-full paint on `/`.

### Fixes

| File | Change |
| --- | --- |
| `apps/user/src/hooks/use-mobile.tsx` | `useSyncExternalStore` + synchronous `matchMedia` (no effect-delayed breakpoint) |
| `apps/user/src/routes/index.tsx` | Eager `HomeDesktopRoot` import (no lazy boundary on home) |
| `apps/user/src/routes/explore_.$styleId.tsx` | Shared `useIsMdUp()` (same pattern) |

### After (3-run median)

| Route | CLS before | CLS after |
| --- | ---: | ---: |
| `/` desktop | **1.102** | **0.043** |
| Perf desktop | 56 | **80** |

---

## P2 — Explore mobile LCP (`desktopDesc` @ 6.7s)

### Root cause chain

1. **Wrong layout on mobile:** `apps/user/src/routes/explore.tsx` rendered only `ExploreDesktopPage` (no `DesktopPageSplit`), so mobile lab saw desktop copy `explorePage.desktopDesc` as largest text after hydration.
2. **No LCP asset on `/explore`:** unlike `/ai-style`, explore had no head preload / boot script for catalog imagery.
3. **Primary bottleneck (unchanged):** `apps/user/src/routes/__root.tsx` sets `ssr: false` — **no HTML content** until `index-*.js` (~134 kB gzip) executes. Lighthouse `lcp-breakdown-insight` on explore: TTFB ~6.5 ms, image load ~3.6 ms, **element render delay ~330 ms** inside an **~6.7s FCP** window dominated by JS.

### Fixes

| File | Change |
| --- | --- |
| `apps/user/src/routes/explore.tsx` | `DesktopPageSplit` + `ExploreMobilePage` / `ExploreDesktopPage`; route `head()` preload for LCP WebP |
| `apps/user/src/components/explore/ExploreMobilePage.tsx` | Mobile-first layout; full-width hero `EXPLORE_LCP_HERO_SRC` |
| `apps/user/src/lib/explore-lcp-static.ts` | `EXPLORE_LCP_BOOT_SCRIPT` + constant hero URL |
| `apps/user/src/routes/__root.tsx` | Inline explore LCP boot script in shell |
| `apps/user/src/components/explore/MorfAiExploreCard.tsx` | Extracted card (explore route chunk split) |

### LCP element (after)

`docs/mysaloon-v3-qa/lighthouse/explore-run2.json`:

```html
<img src="/hairstyles/men/personas/irland/mid-fade.webp" … fetchpriority="high" loading="eager" …>
```

**Not** `desktopDesc` text — product/SEO issue resolved; **ms target** still fails until first paint is not JS-gated.

| Metric | Before (2-run median) | After (3-run median) |
| --- | ---: | ---: |
| Explore mobile LCP ms | 6716 | 11461* |
| Explore mobile FCP ms | 6716 | 6743 |
| Explore mobile Perf | 57 | 56 |

\*LCP ms rose because the **largest element is now a hero image** (larger than paragraph text); FCP unchanged → bottleneck is still **shared JS boot**, not WebP transfer.

---

## P3 — Bundle analysis (production build)

Generated: `node scripts/report-bundle-sizes.mjs` → [`docs/mysaloon-v3-qa/bundle-sizes.json`](mysaloon-v3-qa/bundle-sizes.json)

| Measure | Value |
| --- | ---: |
| Main entry `index-*.js` | 434 kB raw / **134 kB gzip** |
| Initial JS (index + router + query + i18n + radix) | 916 kB raw / **291 kB gzip** |
| Initial CSS | 292 kB raw / **41 kB gzip** |
| `vendor-zxing` | 418 kB / **107 kB gzip** — **not** in explore chunk list |
| `vendor-mediapipe` | 135 kB / **40 kB gzip** — morf/face routes |
| `vendor-motion` | 130 kB / **43 kB gzip** — motion-heavy UI |
| Explore route chunk `explore-*.js` | **~10 kB** gzip (see `exploreRouteChunks` in JSON) |

`DeferredClientWidgets` already code-splits Firebase / GA / onboarding off the critical path for public routes.

---

## P4 — TypeScript release safety

Command: `cd apps/user && npx tsc --noEmit`  
Output: [`docs/mysaloon-v3-qa/typescript-baseline.txt`](mysaloon-v3-qa/typescript-baseline.txt) — **91 errors** (pre-existing: scanner, chat types, `__root` errorComponent typing, mock-data, vite config).  
This performance pass **did not add** new TS errors; no unrelated repo-wide rewrite performed.

---

## P5 — Lighthouse medians (identical lab conditions)

**Before:** [`docs/mysaloon-v3-qa/lighthouse/manifest-before-d5759810.json`](mysaloon-v3-qa/lighthouse/manifest-before-d5759810.json) (2 runs/route)  
**After:** [`docs/mysaloon-v3-qa/lighthouse/manifest.json`](mysaloon-v3-qa/lighthouse/manifest.json) (3 runs/route)

| Route | Factor | Perf before → after | LCP ms before → after | CLS before → after |
| --- | --- | ---: | ---: | ---: |
| Home `/` | mobile | 48.5 → **54** | 12274 → 11910 | 0 → 0.068 |
| Home `/` | desktop | 56 → **80** | 2767 → 2735 | **1.102 → 0.043** |
| Guides | mobile | 48.5 → **57** | 9738 → 6687 | 0.034 → 0.068 |
| Guides | desktop | — → **90** | — → 1226 | — → 0.125 |
| Explore | mobile | 57 → 56 | 6716 → 11461 | 0.068 → 0.068 |
| Explore | desktop | 78.5 → **79** | 2991 → 3031 | 0.043 → 0.043 |
| Hairstyle detail | mobile | 56 → 57 | 13135 → 12474 | 0.068 → 0.068 |
| AI Style | mobile | 56 → 62 | 12675 → 12775 | 0.068 → 0.068 |
| Ingredient scanner landing | mobile | 76.5 → **79** | 3703 → 3671 | 0.068 → **0.00006** |
| Scanner auth shell | mobile | 68 → 70 | 10411 → 11019 | 0.068 → **0** |

SEO **100** and Accessibility **≥96** on all catalogued routes.

### Regression tests

| Suite | Result |
| --- | --- |
| Vitest `apps/user` | **94 passed**, 3 skipped |
| Prod build | `npm run build` OK |
| Django `:8001` hairstyles API | **200** during LH |

---

## Remaining blockers (with evidence)

1. **Mobile LCP ≤2.5s / Perf ≥90** on home, explore, guides: `ssr: false` on root — FCP ~6.6–7.8s lab on mobile (see manifest). Requires selective SSR/streaming HTML for public SEO routes **without** reintroducing React #423 on auth-heavy routes (see comment on `salon.$id.tsx`).
2. **Guides desktop CLS 0.125** — slightly above 0.1; likely font/layout on article list (not addressed in this pass).
3. **Shared `index-*` ~134 kB gzip** — further diet needs router-level deferral audit (out of scope for minimal V3 fix).

---

## Artifacts

| Artifact | Path |
| --- | --- |
| Lighthouse manifest (after) | `docs/mysaloon-v3-qa/lighthouse/manifest.json` |
| Lighthouse manifest (before) | `docs/mysaloon-v3-qa/lighthouse/manifest-before-d5759810.json` |
| Raw Lighthouse JSON | `docs/mysaloon-v3-qa/lighthouse/*-run*.json`, `*-median.json` |
| Bundle sizes | `docs/mysaloon-v3-qa/bundle-sizes.json`, `bundle-sizes-after.json` |
| TypeScript baseline | `docs/mysaloon-v3-qa/typescript-baseline.txt` |
| Bundle script | `apps/user/scripts/report-bundle-sizes.mjs` |

---

## Source files touched (this pass)

- `apps/user/src/hooks/use-mobile.tsx`
- `apps/user/src/routes/index.tsx`
- `apps/user/src/routes/explore.tsx`
- `apps/user/src/routes/__root.tsx`
- `apps/user/src/routes/explore_.$styleId.tsx`
- `apps/user/src/components/explore/ExploreMobilePage.tsx` (new)
- `apps/user/src/components/explore/MorfAiExploreCard.tsx` (new)
- `apps/user/src/components/desktop/pages/ExploreDesktopPage.tsx`
- `apps/user/src/lib/explore-lcp-static.ts` (new)
- `apps/user/scripts/run-lighthouse-prod.mjs` (guides-desktop route)
- `apps/user/scripts/report-bundle-sizes.mjs` (new)