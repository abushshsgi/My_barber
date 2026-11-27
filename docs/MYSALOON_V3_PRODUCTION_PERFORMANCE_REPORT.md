# MySaloon V3 — production performance & release candidate

Date: 2026-11-27  
Branch: `feat/mysaloon-v3-ecosystem`  
Report commit baseline: `b8a02c4f` (pre-performance commits on this pass)  
Scanner V2 RC: not merged · `main`: not merged · articles: not published · port **8000**: untouched

---

## Executive summary

| Area | Result |
| --- | --- |
| Production build | Nitro `node dist/server/index.mjs` on **:3002**, `API_UPSTREAM_URL=http://127.0.0.1:8001` |
| Lighthouse (prod lab) | Medians in [`docs/mysaloon-v3-qa/lighthouse/manifest.json`](mysaloon-v3-qa/lighthouse/manifest.json); **mobile Performance 48–68** (target 90 not met) |
| Dev LCP 79.5s root cause | Vite dev module graph + main-thread blocking (`node_modules/.vite/deps/chunk-*.js`), not production image load |
| Bundle splitting | Explore route chunk ~10 kB; ZXing isolated to `vendor-zxing` (~418 kB, scanner routes only) |
| Scanner E2E auth | **Fixed** — isolated user on `qa_verify_8001.sqlite3`, real JWT (`after-history-empty.png` captured) |
| Regression | Vitest 94/94 pass (+3 skip), Django `content_seo` 4/4, Playwright scanner 6/6, polish 8 pass / 1 skip, SEO 3/3 |
| Release recommendation | **Conditional RC** — ship functional/SEO polish; mobile lab Performance needs CDN + shared chunk diet before claiming 90+ |

---

## Production build configuration

| Setting | Value |
| --- | --- |
| Build | `npm run build` in `apps/user` (TanStack Start + Nitro `node-server`) |
| Serve | `NODE_ENV=production` · `PORT=3002` · `API_UPSTREAM_URL=http://127.0.0.1:8001` |
| Backend QA | `MYSALOON_QA_ISOLATED=1` · `DATABASE_URL=sqlite:///qa_verify_8001.sqlite3` · `runserver 127.0.0.1:8001` |
| Not used | Vite dev `:3000` for benchmarks · production API · article publish |

---

## Lighthouse — baseline vs production

### Development baseline (prior evidence)

Source: `docs/_lighthouse-explore-dev.json` — Vite dev `http://127.0.0.1:3000/explore`, mobile simulation.

| Category | Score |
| --- | ---: |
| Performance | 30 |
| Accessibility | 100 |
| SEO | 100 |
| **LCP** | **79.5 s** |
| CLS | 0.028 |
| TBT | 1310 ms |

### Production medians (this pass)

Environment: Lighthouse **v13.6** lab throttling; **2 comparable runs** per route (median); server `http://127.0.0.1:3002`. Raw JSON: `docs/mysaloon-v3-qa/lighthouse/*-run*.json`, aggregates: `*-median.json`, catalog: `manifest.json`.

| Route | Form factor | Perf | A11y | BP | SEO | LCP | CLS | FCP | SI | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` (home → `/ai-style` redirect client-side) | mobile | 48.5 | 100 | 96 | 100 | 12.3s | 0 | 7.1s | 7.1s | 418ms |
| `/` | desktop | 56 | 100 | 96 | 100 | 2.8s | **1.10** | 1.2s | 1.5s | 10ms |
| `/guides` | mobile | 48.5 | 100 | 96 | 100 | 9.7s | 0.03 | 6.6s | 6.6s | 426ms |
| `/guides/qa-lighthouse-article` | mobile | 52 | 100 | 96 | 100 | 9.9s | 0.03 | 6.7s | 6.7s | 296ms |
| `/explore` | mobile | 57 | 100 | 96 | 100 | **6.7s** | 0.07 | 6.7s | 7.3s | 161ms |
| `/explore` | desktop | 78.5 | 100 | 96 | 100 | 3.0s | 0.04 | 1.2s | 1.7s | 2ms |
| `/explore/men-textured-crop` | mobile | 56 | 96 | 96 | 100 | 13.1s | 0.07 | 6.7s | 6.7s | 156ms |
| `/ai-style` | mobile | 56 | 100 | 96 | 100 | 12.7s | 0.07 | 2.3s | 6.0s | 421ms |
| `/morf-ai/ingredient-scanner` | mobile | **76.5** | 100 | 96 | 100 | **3.7s** | 0.07 | 3.7s | 3.7s | 218ms |
| `/ai-style/care/ingredient` (unauthenticated shell) | mobile | 68 | 98 | 96 | 100 | 10.4s | 0.07 | 2.4s | 2.4s | 185ms |

**Targets (engineering):** Performance ≥90, LCP ≤2.5s on important public routes — **not met** on mobile lab (local Nitro + cold JS). Desktop `/explore` is closest (Perf 78.5, LCP 3.0s). SEO/A11y ≥95 **met**.

---

## §04 — Root cause: development LCP 79.5s

Evidence from `docs/_lighthouse-explore-dev.json` (`lcp-breakdown-insight`, `bootup-time`, `network-dependency-tree-insight`):

| Finding | Detail |
| --- | --- |
| Lab metric | `largest-contentful-paint` numeric **79463 ms** on Vite **dev** |
| LCP element (dev) | Grid hairstyle `<img>` (`mid-fade.webp`) — image byte load **fast** (~5 ms resource duration) |
| Subparts (misleadingly small) | TTFB ~11 ms, resource load ~5 ms, element render delay ~599 ms — **does not explain 79s** |
| Actual blocker | Main-thread **blocked until Vite serves/compiles** `node_modules/.vite/deps/chunk-POVVOG4E.js` (~1250 ms bootup on one chunk alone); dev CSS pipeline (`src/styles.css` ~379 kB, `@tanstack-start/styles.css`) |
| Production contrast | Same `/explore` on Nitro: LCP **6.7s** median; LCP element **text** (`desktopDesc` paragraph), hero scripts ~444 kB `index-*.js` + vendor chunks |

**Conclusion:** The 79.5s figure is a **development-server artifact**, not a production LCP regression. Production still has **mobile LCP 6.7–13s** locally (JS + hydration), separate from the dev anomaly.

---

## §05 — JavaScript bundles (production build)

Largest **client** chunks (gzip), post-optimization pass:

| Chunk | Raw | Gzip | Notes |
| --- | ---: | ---: | --- |
| `index-*.js` (shared entry) | 444 kB | 137 kB | Router shell, shared app |
| `vendor-zxing-*.js` | 418 kB | 109 kB | **Route-scoped** (scanner / barcode) |
| `vendor-radix-*.js` | 227 kB | 73 kB | UI primitives |
| `vendor-mediapipe-*.js` | 131 kB | 39 kB | Morf / face (not on explore first paint) |
| `vendor-motion-*.js` | 133 kB | 44 kB | Motion-heavy routes |
| `explore-*.js` | 10 kB | 3.4 kB | Catalog route split OK |

**Optimizations implemented (behavior preserved):**

- `hair-advisor-barcode-normalize.ts` — scanner normalization without ZXing import.
- Async `retailBarcodeHints()` + lazy `HairAdvisorBarcodeCamera` in `HairAdvisor2ScanPage`.
- Explore grid: **one** `priority` card (`index === 0`), `sizes` on grid images.

**Not done (future):** Further shared `index-*` diet, font subsetting, critical CSS — needs measured follow-up.

---

## §06 — Images

| Measure | Before (grid policy) | After |
| --- | --- | --- |
| Eager catalog tiles | First **4** cards | First **1** (LCP candidate) |
| `sizes` on grid cards | none | `(max-width:640px) 48vw, …` |
| AI reference assets | unchanged | unchanged (no overwrites) |

62 hairstyle WebP assets remain static under `public/hairstyles/`; display URLs unchanged. Lab explore still paints **text** before images on mobile — lazy grid below fold.

---

## §07 — API

Isolated HTTP (`127.0.0.1:8001`, `qa-lighthouse-article` published fixture):

| Endpoint | Bytes | `content` on list |
| --- | ---: | --- |
| `GET /api/v1/content/articles/?locale=uz` | **336** | absent |
| `GET .../qa-lighthouse-article/?locale=uz` | **929** | present |

List serializer fix preserved. No public caching of private advisor analysis added.

---

## §08–09 — Rendering & SEO safety

- CLS mobile catalog ~0.07 (OK). Desktop home CLS **~1.1** in lab — investigate dock/layout shift on redirect/split view (not changed in this pass).
- Hreflang, article structured data, draft protection, SSR head injection **unchanged**.
- Public routes still server-rendered via Nitro; no SEO shell regression introduced.

---

## §10 — Scanner authentication QA

| Check | Status |
| --- | --- |
| Mock JWT | **Removed** for scanner specs |
| Isolated login | `seed_playwright_isolated` + `playwright_auth_json` on `qa_verify_8001` only |
| Playwright | **6/6** `hair-advisor-scanner.spec.ts` on `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002` |
| History empty UI | Verified + `after-history-empty.png` |
| Physical camera | **Not claimed** — simulated permission tests only |

---

## §11 — Physical device QA checklist (manual)

Use on **staging** with real accounts; do not mark pass until performed.

1. Camera permission prompt (Allow / Deny).
2. Camera stream init, torch toggle, gallery permission.
3. EAN-13 and UPC-A on retail packaging (varied lighting).
4. Gallery still decode → product lookup.
5. Manual barcode entry, unknown product, duplicate scan cooldown.
6. History empty / populated, advisor result → history link (`history` search).
7. Navigation Morf ↔ scanner, camera teardown on leave.
8. Android back button / iOS Safari memory reload.

Scanner V2 RC branch remains **out of scope**.

---

## §13 — Regression summary

| Suite | Result |
| --- | --- |
| Vitest (`apps/user`) | **94 passed**, 3 skipped |
| Django `content_seo` | **4 passed** |
| Playwright `hair-advisor-scanner.spec.ts` | **6 passed** |
| Playwright `v3-polish-verification.spec.ts` | **8 passed**, 1 skipped (draft preview), **history + screenshot OK** |
| Playwright `seo.spec.ts` | **3 passed** |
| Production `npm run build` | **Pass** (post-change rebuild) |
| TypeScript `tsc --noEmit` | **Fail** — extensive pre-existing errors; not introduced solely by this pass |

---

## Remaining blockers

1. Mobile lab Performance **48–68** vs target 90 (local Nitro, fat shared bundle, no CDN edge).
2. Mobile LCP **6.7–13s** vs 2.5s target.
3. Desktop home CLS **~1.1** in Lighthouse (lab).
4. Port **8000** not reloaded — staging deploy must pick up serializer + settings before prod cutover.
5. Physical camera QA still **owner/device**.
6. Article publish / merge / prod deploy **explicitly out of scope**.

---

## Optimizations & artifacts

| Artifact | Path |
| --- | --- |
| Lighthouse raw + medians | `docs/mysaloon-v3-qa/lighthouse/` |
| Lighthouse runner | `apps/user/scripts/run-lighthouse-prod.mjs` |
| Playwright auth | `apps/user/e2e/helpers/isolated-auth.ts`, `backend/.../seed_playwright_isolated.py`, `playwright_auth_json.py` |
| QA env flag | `MYSALOON_QA_ISOLATED=1` in `backend/config/settings.py` |

---

## Release recommendation

**Conditional release candidate for functional V3 + SEO polish**, pending:

- Owner review of Lighthouse manifest and screenshots.
- Staging deploy with **CDN**, HTTP/2, and warm cold start (expect materially better than local lab).
- Physical scanner checklist on Android/iOS.
- Explicit **no-merge** of Scanner V2 and **no publish** until owner approves.

Do **not** interpret mobile lab scores as field Core Web Vitals or Google ranking outcomes.