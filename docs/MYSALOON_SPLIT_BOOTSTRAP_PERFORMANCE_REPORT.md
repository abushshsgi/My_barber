# MySaloon — split-bootstrap performance engineering

**Date:** 2026-11-28  
**Branch:** `feat/mysaloon-split-bootstrap` (not merged)  
**Base:** `3ad02db9` (`feat/mysaloon-public-rendering-performance` report SHA)  
**Production (unchanged):** `3caad448`  

---

## Executive summary

| Area | Outcome |
| --- | --- |
| Framework | TanStack Start **1.168.60** supports **one** custom `client.entry` and **one** `router.entry`; **no** per-route dual HTML entry without forking the router bootstrap |
| POC | Async `getRouter()` → `router.public` (9 routes) vs lazy `router.app` (full `routeTree.gen`) + guest Radix deferral on profile control |
| Initial JS gzip (index + vendor-router/query/i18n/radix) | **289 kB → 194 kB** (−33%) — **intermediate JS gate PASSED** |
| Index entry gzip alone | **136 kB → 40 kB** (−71%) |
| Explore LCP median (lab, mobile) | **11.29 s → 10.79 s** (−4.4%) — **below 30% LCP gate; Perf still 57** |
| vendor-radix scripting (LH bootup) | **~843 ms → ~658 ms** (still dominant) |
| SEO Playwright (`:3013`) | **4/4** |
| Vitest | **101** pass, 3 skip |
| Ultimate gate (LCP ≤ 2.5 s, Perf ≥ 90) | **NOT MET** |
| Expansion to home/guides | **STOP** — LCP gate failed |

---

## 01 — Branch isolation

- Created `feat/mysaloon-split-bootstrap` from `3ad02db9`.
- Prior branches untouched; `main` / production unchanged; port **8000** not used.

---

## 02 — Framework capability audit (installed)

| Component | Version |
| --- | --- |
| `vite` | 7.3.x |
| `nitro` | 3.0.260429-beta |
| `@tanstack/react-start` | 1.168.60 |
| `@tanstack/react-router` | 1.170.41 |
| `@tanstack/router-plugin` | 1.168.11 |
| `@lovable.dev/vite-tanstack-config` | 2.1.1 |

**Supported (verified in `@tanstack/start-plugin-core` schema):**

- Single custom `tanstackStart.client.entry` (default `client.tsx` hydrate shell).
- Single custom `tanstackStart.router.entry` (`router.tsx` → `#tanstack-router-entry`).
- `router.autoCodeSplitting: true` (route component chunks, **not** manifest splitting).
- `server.entry`, Nitro `preset: node-server`, HTML `shellComponent` + `Scripts`.
- `prerender` / page rules (SEO HTML; does not fix CSR LCP with `ssr: false` root).

**Not supported / not used:**

- Multiple parallel client entries per URL (no manifest-level dual bootstrap).
- Route-group-specific root layouts with separate Vite client bundles.
- Selective hydration of the full app without RSC (`rsc.enabled` not enabled).
- Full React SSR on root while `ssr: false` on `__root` (prior experiments — still unsafe).

**Smallest supported alternative implemented:** async **`getRouter()`** path fork + hand-built **`routeTree.public.ts`** so the main entry no longer static-imports **100+** generated routes.

---

## 03 — Shared index bundle autopsy

### Before (build C, public shell @ `3ad02db9`)

| Asset | Gzip |
| --- | ---: |
| `index-*.js` entry | **136 kB** |
| Initial vendor set (router, query, i18n, radix + index) | **289 kB** |
| `vendor-radix` | 71 kB |
| `vendor-router` | 41 kB |

Root cause: `router.tsx` → `routeTree.gen.ts` **eager static imports** of every file route module, pulling UI/provider graphs into the entry chunk despite shell split.

### After (build D, split bootstrap)

| Asset | Gzip | Explore guest critical path |
| --- | ---: | --- |
| `index-*.js` | **40 kB** | Yes |
| `router.app-*.js` | **28 kB** | Deferred (idle preload) |
| Initial vendor set | **194 kB** | Yes (radix still eager via layout graph) |
| `vendor-radix` | 71 kB | Yes (dropdown/dialog chain) |

Module signals in minified `index` no longer contain `routeTree.gen` strings (moved to `router.app` chunk). See `docs/mysaloon-v3-qa/bundle-index-modules.json`.

**Largest remaining eager deps on Explore:** `vendor-radix`, `vendor-router`, `vendor-query`, `vendor-i18n`, `UserLayout` / desktop chrome, `uz.json` i18n bundle.

**Safely deferred:** full route manifest, `ProfileAccountDropdown` (Radix) for guests (link to `/auth` instead).

---

## 04 — Radix / global UI audit

Lighthouse bootup-time (build D, run 1):

| Script | Scripting ms |
| --- | ---: |
| `vendor-radix-*.js` | **658** |
| `gtag` (third-party) | 98 |
| document | 17 |

Guest Explore header: **`ProfileAccountEntry`** avoids Radix until credentials exist; notifications/chat remain plain `Link` components.

Radix still loads via other layout paths (e.g. mobile dock, explore filters, `sheet`/`dialog` in catalog widgets) — **not eliminated**.

---

## 05 — Controlled A/B/C/D (Explore mobile, simulate, 3 runs)

| Build | Source | LCP median | Perf | TBT median | Initial JS gzip |
| --- | --- | ---: | ---: | ---: | ---: |
| A `3caad448` | archived manifest | 6716 ms | 57 | ~161 ms | (older graph) |
| B `4bee927b` hybrid | `lighthouse-hybrid-ssr/` | 11425 ms | 57 | 127 ms | ~289 kB family |
| C `3ad02db9` public shell | `ab-lighthouse-public-shell/` | **11286 ms** | 57 | **97 ms** | **289 kB** |
| **D split-bootstrap** | `ab-lighthouse-split-bootstrap/` | **10789 ms** | **57** | **107 ms** | **194 kB** |

Raw artifacts: `docs/mysaloon-v3-qa/ab-lighthouse-{public-shell,split-bootstrap}/explore-run{1,2,3}.json`.

**Variability:** LCP run spread on D ≈ 10.72–11.35 s; C ≈ 11.1–11.5 s family — **~5% LCP delta inside prior noise**.

---

## 06 — Implemented architecture (Explore POC)

```
router.tsx (async getRouter)
  ├─ guest /explore → import router.public → routeTree.public (9 routes)
  └─ else             → import router.app    → routeTree.gen (full app)
```

**Public routes:** `/`, `/explore`, `/$locale/explore`, hairstyle detail + category, `/auth`, try-on (incl. localized).

**Leaving public manifest:** unknown path → `NotFoundComponent` calls `promoteToFullAppDocument()` (loads `router.app`, hard navigation — preserves security, avoids half-hydrated private routes).

**Unchanged:** `PublicCatalogShell`, `InteractiveAppShell`, SEO Nitro inject, international hreflang.

---

## 07–08 — Budgets (Explore guest)

| Metric | Target | Build C | Build D |
| --- | ---: | ---: | ---: |
| Initial JS gzip | −30% | 289 kB | **194 kB** ✓ |
| LCP | ≤ 2500 ms | 11286 ms | 10789 ms ✗ |
| CLS | ≤ 0.1 | 0.068 | 0.068 |
| SEO | ≥ 95 | 100 | 100 |
| TTFB | — | ~5 ms | ~5 ms |

FCP median ~6.1 s (down modestly from public shell).

---

## 09 — International SEO

Playwright SEO **4/4** on lab server `:3013` (localized explore, hreflang, sitemap/robots). No slug changes.

---

## 10 — Security

Public router omits private route definitions on first paint; promotion to full app uses full `beforeLoad` + `requireAuth`. No personalized caching added.

---

## 11 — Regression

| Suite | Result |
| --- | --- |
| `npm run build` | PASS |
| Vitest | 101 pass, 3 skip |
| Playwright SEO | 4/4 |

Full scanner/polish/auth suites not re-run this pass (same harness as build C; recommended before any merge).

---

## 12 — Acceptance gate verdict

| Criterion | Verdict |
| --- | --- |
| ≥30% initial JS before hero | **PASS** (−33%) |
| ≥30% Explore LCP | **FAIL** (−4.4%) |
| No critical functional regression | **Not observed** (SEO pass) |
| Ultimate LCP ≤ 2.5 s / Perf ≥ 90 | **FAIL** |

**Expansion gate:** **FAILED** — do not extend beyond Explore.

---

## 13 — Architecture decision record

| Option | Complexity | Notes |
| --- | --- | --- |
| **A. Keep split-bootstrap + shrink Radix/layout graph** | M | Next incremental win; target explore-only chrome without global dialog/menu imports |
| **B. TanStack `prerender` static HTML for Explore + minimal hydrate** | L–M | SEO already strong; LCP still JS-bound without true SSR paint |
| **C. Enable RSC / partial SSR (framework upgrade path)** | XL | Not attempted; schema supports `rsc.enabled` but product is CSR-rooted today |
| **D. Separate origin or subdomain for marketing** | L ops | Bypasses app route tree entirely |
| **E. Reject further shell-only experiments** | — | Prior hybrid/public shell plateau confirmed |

**Recommendation:** Continue on experimental branch only. Production stays **`3caad448`**. Merge candidate requires **meaningful LCP drop** (Radix decoupling or true static LCP element outside React), not another provider shell.

International SEO fixes from hybrid branch remain **cherry-pickable without** this performance branch.

---

## 14 — Changed files

| Path | Role |
| --- | --- |
| `router.tsx` | Async bootstrap fork |
| `router.app.tsx` / `router.public.tsx` | Full vs public router factories |
| `routeTree.public.ts` | Minimal route manifest |
| `lib/split-bootstrap.ts` | Path detection, promote, preload |
| `lib/create-app-query-client.ts` | Shared query client |
| `components/desktop/profile/ProfileAccountEntry.tsx` | Guest Radix deferral |
| `routes/__root.tsx` | Public-bootstrap 404 promote |
| `scripts/analyze-index-graph.mjs` | Index chunk signals |
| `scripts/run-controlled-ab-lighthouse.mjs` | `shell: true` for Windows LH |

---

## Release recommendation

**Do not merge or deploy.** Push experimental branch for owner review.

**Final commit:** `c6b5a700` on `feat/mysaloon-split-bootstrap`