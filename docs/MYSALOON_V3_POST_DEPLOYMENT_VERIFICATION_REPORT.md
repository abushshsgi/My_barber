# MySaloon V3 — post-deployment verification (live production)

**Date:** 2026-11-28  
**Scope:** Read-only stabilization and verification. No deploy, no data changes, port **8000** untouched.  
**Baseline:** [`docs/MYSALOON_UNIFIED_PRODUCTION_DEPLOYMENT_REPORT.md`](MYSALOON_UNIFIED_PRODUCTION_DEPLOYMENT_REPORT.md)

---

## Executive summary

| Area | Status |
| --- | --- |
| Release alignment (FE/BE) | **Stable** @ `3caad448` / build `3caad44` |
| API + Redis + services | **Healthy** |
| Deployment 502 | **Resolved** — transient at restart; no ongoing 5xx pattern |
| Live Lighthouse (prod URL) | **Captured** — medians in [`docs/mysaloon-v3-qa/lighthouse-live-prod/manifest.json`](mysaloon-v3-qa/lighthouse-live-prod/manifest.json) |
| Functional HTTP smoke | **Pass** (62 hairstyles, core routes 200) |
| `/en/explore`, `/ru/explore` | **404 by design** — no route files; sitemap/hreflang do not reference them |
| Full DB backup | **Gap** — release backup is partial (see §7) |
| Physical scanner | **Pending** — checklist in §5 |

**Verdict:** **STABLE** for continued operation; follow-ups: device QA, full DB backup policy, optional locale explore routes, performance (non-blocking).

---

## 1. Live version evidence

| Source | Value |
| --- | --- |
| `https://mysaloon.uz/version.json` | `buildId: 3caad44`, built `2026-11-28T10:55:37.122Z` |
| VPS `/opt/mysaloon/Mybarber` | `3caad4483933c7fa36895303f00a9e769a626e17` |
| VPS `/var/www/mysaloon/source` | `3caad4483933c7fa36895303f00a9e769a626e17` |
| `/var/lib/mysaloon/deployed-sha` | `3caad448…` |

---

## 2. Service health (2026-11-28 ~16:12 +05)

| Check | Result |
| --- | --- |
| `mysaloon-user` (Nitro) | **active** |
| `mysaloon.service` (Django) | **active** |
| `nginx` | **active** |
| `GET https://api.mysaloon.uz/health/` | **200** — `"ok": true`, Redis ping **true**, realtime **ready** |
| Load average | **0.12** (low) |
| RAM available | **~2.8 GiB** of 3.8 GiB |
| Disk `/` | **37%** used (~36 GiB free) |

### Post-deploy errors

| Signal | Finding |
| --- | --- |
| Deploy-window `health=502` | Observed during `mysaloon.service` restart (~15:50 +05); **200** within ~10 s |
| `journalctl` errors (15:45–16:15) | No persistent ERROR/crit lines in sampled window |
| Nginx access `502` count (file snapshot) | **1** total line match (includes historical deploy blip; **no recurring 502** after stabilization) |
| Service restarts | **None** performed during this verification pass |

---

## 3. Database migrations

`content_seo` on production:

```
[X] 0001 … [X] 0005_phase1_locale_editorial
```

Public `GET /api/v1/content/articles/?locale=uz` → **`[]`** (drafts not published).

---

## 4. Production performance (Lighthouse v13.6)

**Environment:** Lighthouse CLI from operator workstation → **live** `https://mysaloon.uz`, default **lab throttling**, **3 runs/route**, **medians** recorded.

**Compare baseline:** pre-release **local** Nitro `http://127.0.0.1:3002` ([`docs/mysaloon-v3-qa/lighthouse/manifest.json`](mysaloon-v3-qa/lighthouse/manifest.json)). Differences: TLS + CDN/static caching + geographic RTT; **not** apples-to-apples for absolute scores.

### Medians (live production)

| Route | Factor | Perf | A11y | BP | SEO | LCP | FCP | CLS | TBT | TTFB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | mobile | 57 | 100 | 96 | 100 | 7.9s | 5.2s | 0 | 234ms | 147ms |
| `/` | desktop | 55 | 100 | 96 | 100 | 7.9s | 5.2s | 0 | 0 | 158ms |
| `/explore` | mobile | 60 | 100 | 96 | 100 | 6.6s | 5.4s | 0 | 179ms | 154ms |
| `/explore` | desktop | 56 | 100 | 96 | 100 | 6.5s | 5.2s | 0 | 0 | 147ms |
| `/guides` | mobile | 61 | 100 | 96 | 100 | 5.1s | 5.1s | 0 | 299ms | 145ms |
| `/guides` | desktop | 57 | 100 | 96 | 100 | 5.2s | 5.2s | 0 | 8ms | 148ms |
| `/explore/men-textured-crop` | mobile | 54 | 96 | 96 | 100 | 7.6s | 5.2s | 0 | 286ms | 161ms |
| `/explore/men-textured-crop` | desktop | 55 | 96 | 96 | 100 | 7.6s | 5.2s | 0 | 4ms | 170ms |
| `/morf-ai/ingredient-scanner` | mobile | **87** | 100 | 96 | 100 | **2.6s** | 2.6s | ~0 | 252ms | 149ms |
| `/morf-ai/ingredient-scanner` | desktop | 69 | 100 | 96 | 100 | **2.5s** | 2.5s | 0.006 | 0 | 148ms |

Raw JSON: `docs/mysaloon-v3-qa/lighthouse-live-prod/*-run*.json`, `*-median.json`.

### Comparison notes (prod vs local lab)

| Observation | Detail |
| --- | --- |
| Mobile home LCP | Prod **~7.9s** vs local lab **~11.9s** — prod **faster** in this window (TTFB ~150ms; may include edge caching) |
| Desktop home LCP / Perf | Local lab had **CLS 0.043**, Perf **80**; live desktop home **CLS 0**, Perf **55**, LCP **~7.9s** — likely **client redirect / shell** behavior on `/` under live measurement (differs from isolated Nitro home test) |
| Explore mobile LCP | **~6.6s** prod vs **~6.7–11.5s** local — **aligned** with JS-gated first paint hypothesis |
| Scanner landing | Prod mobile LCP **≤2.6s** — meets **2.5s** target marginally on median run |
| Performance ≥90 | **Not met** on catalog/home routes; **non-blocking** per release policy |
| CDN | **Measured** via live origin; **no assumed CDN gain** without CrUX / Search Console |

---

## 5. Functional verification (HTTP / shell)

| Check | Result | Notes |
| --- | --- | --- |
| Homepage `/` | **200** | |
| Explore `/explore` | **200** | |
| Guides `/guides` | **200** | |
| Localized guides `/en/guides`, `/ru/guides` | **200** | |
| Hairstyle detail `/explore/men-textured-crop` | **200** | Canonical + ImageObject + BreadcrumbList in HTML |
| Try-on nav `/explore/men-textured-crop/try` | **200** | No paid AI executed |
| Morf scanner landing | **200** | |
| Hair Advisor shell `/ai-style/care/ingredient` | **200** | |
| Auth route `/auth` | **200** | **Credentials login not exercised** (no secrets) |
| API hairstyles | **62** models, all have `id` | |
| Articles public API | **`[]`** | Drafts excluded |
| Smart Scanner UI / history | **Not signed in** | Requires owner test account on device/browser |
| Morf try-on / face AI | **Not executed** | No authorization for paid generation |

---

## 6. Localized Explore (`/en/explore`, `/ru/explore`)

### Current behavior

| URL | HTTP |
| --- | --- |
| `/en/explore` | **404** |
| `/ru/explore` | **404** |
| `/explore` | **200** |

### Architecture (code)

| Mechanism | Explore | Guides (contrast) |
| --- | --- | --- |
| TanStack route files | **`/explore` only** — no `$locale.explore.tsx` | `$locale.guides.tsx`, `$locale.guides_.$slug.tsx` |
| `LANDING_PAGES` registry | `explore.uzPath = "/explore"`, **`trilingual: false`** | `guides` **trilingual: true** |
| `buildHreflangAlternates("explore")` | **Not used** on live `/explore` page (`explore.tsx` custom `head()` without hreflang) | Guides HTML has **4** hreflang links |
| `localizedLandingPath("explore", "en")` | Would be **`/en/explore`** if trilingual were **true** — but flag is **false** | `/en/guides` exists |

RU/EN copy for explore **exists** in `LANDING_COPY.explore` for SEO landings / registry resolution, but **UI locale** is typically in-app i18n on a **single URL**.

### Sitemap / hreflang safety

| Asset | Invalid `/en/explore`? |
| --- | --- |
| `sitemap-static.xml` | Lists **`https://mysaloon.uz/explore` only** — **no** `/en/explore` |
| `sitemap-styles.xml` | Style URLs under `/explore/{id}` |
| Live `/explore` HTML | **No** hreflang to `/en/explore` (spot check) |
| Morf scanner landing | Proper **uz/ru/en/x-default** hreflang |

**Conclusion:** **404 is not a sitemap/hreflang bug** — those URLs were never advertised. Risk is **user/bookmark expectation** and **parity with guides**.

### Targeted implementation plan (no production change in this pass)

**Option A — URL-localized catalog (parity with guides)**  
1. Add `apps/user/src/routes/$locale.explore.tsx` (and optionally category/detail under locale prefix).  
2. Set `explore.trilingual: true` in `LANDING_PAGES` **or** wire `buildRegistryHead("explore", locale)` in `head()`.  
3. Add Vitest + Playwright for `/en/explore`, `/ru/explore` **200**.  
4. Extend `sitemap-static.xml` generation with `/en/explore`, `/ru/explore` only after routes ship.  
5. **Do not** add hreflang until routes return 200.

**Option B — Single canonical catalog (status quo, document)**  
1. Keep **`trilingual: false`**.  
2. Add help-center / footer note: catalog is **`/explore`** for all languages; use in-app language switcher.  
3. Optional: **redirect** `/en/explore` → `/explore` with `301` **only** if product accepts single canonical (not implemented here).

**Recommendation:** **Option A** if SEO/marketing requires localized URLs; **Option B** if i18n-in-place is sufficient (current design intent in registry).

---

## 7. SEO verification (live)

| Check | Result |
| --- | --- |
| `robots.txt` | **200**, allows `/`, disallows `/wallet`, `/auth`, points to `sitemap.xml` |
| `sitemap.xml` index | **200**, includes static, morf, salons, styles, images, categories, blog |
| `sitemap-blog.xml` | **200**, **empty** urlset |
| `sitemap-images.xml` | **200** |
| Explore detail canonical | `https://mysaloon.uz/explore/men-textured-crop` |
| Guides hreflang | **uz, ru, en, x-default** |
| Scanner landing hreflang | **4** alternates |
| `/wallet` | **`noindex, nofollow`** in HTML |
| Google indexing / rankings | **No claim** (no Search Console export in this pass) |

---

## 8. Backup coverage

| Item | Present? |
| --- | --- |
| Release dir `…/release-20261128-154936` | **Yes** |
| Pre-release `user-dist.tar.gz` (~36 MB) | **Yes** |
| Git SHAs + `version.json` | **Yes** |
| `content_seo_dumpdata.json` (~19 KB) | **Yes** — **partial** (`dumpdata content_seo` only) |
| Full PostgreSQL dump | **Not** in release bundle; `pg_dump` **exists** on VPS (`/usr/bin/pg_dump`) but **was not run** during release backup |
| Media blobs | **Not** separately archived |

**Recovery posture:** Frontend **rollback proven** via dist tarball. Database **forward-fix preferred**; full restore requires **scheduled `pg_dump -Fc`** (or provider snapshot) before future releases.

---

## 9. Physical scanner QA checklist

**Status:** All items **NOT PASSED** until executed on hardware.

### Web (`mysaloon.uz`) — signed-in Hair Advisor / Smart Scanner

| # | Test | Device / browser | Pass? |
| --- | --- | --- | --- |
| 1 | Camera permission grant → preview live | Android Chrome | ☐ |
| 2 | Camera permission grant → preview live | iOS Safari | ☐ |
| 3 | Permission denied UI (no crash) | Either | ☐ (Playwright simulated pre-release) |
| 4 | Live **EAN-13** scan → product or unknown flow | Android | ☐ |
| 5 | Live **UPC** scan | Android / iOS | ☐ |
| 6 | **Gallery** image with barcode → decode | Android | ☐ |
| 7 | **Manual** barcode entry | Either | ☐ |
| 8 | Unknown barcode → not-found panel | Either | ☐ |
| 9 | Product resolver → result ingredients | Either | ☐ |
| 10 | Scan **history** list + detail | Signed-in | ☐ |
| 11 | Navigation Hair Advisor ↔ scanner landing | Either | ☐ |

### Native Expo (`apps/mobile`, API often **:8000**)

| # | Test | Notes | Pass? |
| --- | --- | --- | --- |
| M1 | Morf / scanner flow on device build | Separate from production web deploy | ☐ |
| M2 | Barcode with device camera | Not validated against **3caad448** VPS web | ☐ |

**Do not** mark hardware rows complete from browser-only verification.

---

## 10. Remaining risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| No full DB backup at release | **Medium** | Schedule automated `pg_dump` + off-site retention |
| Physical scanner unverified | **Medium** | Run §9 checklist |
| Mobile LCP >2.5s on catalog | **Low** (known) | Selective SSR **deferred**; perf sprint later |
| `/en/explore` 404 vs guides 200 | **Low** (product/SEO) | Option A/B plan §6 |
| 91 TS errors (baseline) | **Low** | No new gate failures; monitor on touch |

---

## 11. Recommended next actions

1. Owner: run **§9** on Android + iOS against production.  
2. Ops: add **full DB backup** to pre-release script (alongside `content_seo` dump).  
4. Product: decide **Option A vs B** for localized Explore URLs.  
5. Engineering: optional Lighthouse on **desktop home** after clarifying `/` redirect behavior in CrUX.  
6. **Do not** publish Phase 1 articles until editorial sign-off.

---

## Artifacts

| File | Purpose |
| --- | --- |
| `docs/mysaloon-v3-qa/lighthouse-live-prod/manifest.json` | Live prod Lighthouse medians |
| `apps/user/scripts/run-lighthouse-live-site.mjs` | Repeatable live audit script |
| [`docs/MYSALOON_UNIFIED_PRODUCTION_DEPLOYMENT_REPORT.md`](MYSALOON_UNIFIED_PRODUCTION_DEPLOYMENT_REPORT.md) | Deploy record |