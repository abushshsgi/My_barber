# MySaloon V3 — hybrid SSR, backup safety & international Explore SEO

**Date:** 2026-11-28  
**Branch:** `feat/mysaloon-selective-ssr` (not merged; production remains `3caad448`)  
**Restriction compliance:** No production deploy, no `main` merge, port **8000** untouched, no article publish, no paid AI.

---

## Executive summary

| Area | Outcome |
| --- | --- |
| Production backup readiness | Procedure + gated `pg_dump` hook documented; **not executed** on live DB (owner approval required) |
| Framework audit | TanStack Start **1.168.x** / Router **1.170.x**, Nitro `node-server`, global root **`ssr: false`** |
| SSR proof of concept | **Hybrid Nitro shell** (not full React route SSR): explore LCP static shell + enriched `seo-prerender` catalog snapshot |
| International Explore (Option A) | **`/en/explore`**, **`/ru/explore`** routes; `explore.trilingual: true`; sitemap + hreflang cluster |
| Performance vs baseline | Explore mobile LCP **~11.4s** lab (hybrid branch) vs **~6.6s** live prod / **~11.5s** prior local lab — **≤2.5s target not met** |
| Regression | Vitest **98 pass** (3 skip), `content_seo` **4/4**, Playwright SEO **4/4** on `:3003`; TypeScript **91** errors (unchanged) |
| Release recommendation | **Owner review** — merge only after backup execution + device QA + performance acceptance |

---

## 1. Production backup readiness

**Current gap (prod @ `3caad448`):** Release `release-20261128-154936` has dist + `content_seo` dump only — no full PostgreSQL.

**Delivered:**

| Artifact | Purpose |
| --- | --- |
| [`docs/MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md`](MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md) | Roles, retention, integrity, isolated restore |
| [`deploy/vps/pre-release-backup.sh`](../deploy/vps/pre-release-backup.sh) | `showmigrations`, media manifest, `MYSALOON_FULL_DB_BACKUP=1` gate |
| [`deploy/vps/pg-backup-once.sh`](../deploy/vps/pg-backup-once.sh) | VPS-only `pg_dump -Fc` + roles (uses `/etc/mysaloon/pg-backup.env`) |

**Not done:** No live `pg_dump`, no download of production user data to this workstation.

---

## 2. Framework & SSR compatibility

| Topic | Finding |
| --- | --- |
| Root rendering | `apps/user/src/routes/__root.tsx` → **`ssr: false`** (auth, i18n, QueryClient, heavy providers) |
| Per-route `ssr: true` | **Unsafe** today — documented React **#423** on refresh (`salon.$id.tsx` comment); child `ssr: true` does not override root shell |
| Supported hybrid path | `server.ts` → `injectSeoIntoHtml` + route-specific **static LCP shells** (`morph-lcp-shell`, new `explore-lcp-shell`) |
| Article fixture | `guides/qa-lighthouse-article` — server injection with Article JSON-LD (unchanged route SSR mode) |

**Blocker for “full” selective React SSR:** Global client-only root without a split public root layout. **Prerender alternative evaluated:** Nitro HTML enrichment (implemented for Explore POC).

---

## 3. SSR proof of concept — Explore

### Route rendering matrix (POC scope)

| Route | React SSR | Nitro SEO inject | Static LCP shell | `seo-prerender` body |
| --- | ---: | ---: | ---: | ---: |
| `/explore` | No | Yes | **Yes** | **Catalog sample (12 styles + hero)** |
| `/en/explore`, `/ru/explore` | No | Yes | **Yes** | Localized copy + catalog |
| `/guides/qa-lighthouse-article` | No | Yes | No | Title + excerpt + CTA |
| Private (`/wallet`, scanner app) | No | noindex / partial | No | No |

### Initial HTML evidence

| File | Content |
| --- | --- |
| `docs/mysaloon-v3-qa/lighthouse-hybrid-ssr/explore-initial-html.html` | `explore-lcp-static`, hreflang cluster, `<main id="seo-prerender">` with `<ul>` catalog links |
| `docs/mysaloon-v3-qa/lighthouse-hybrid-ssr/article-initial-html.html` | Published QA article head + prerender |

**JavaScript disabled:** `seo-prerender` and static LCP `<img>` are present in first HTML (verified via `Invoke-WebRequest`).

**Hydration:** No new mismatch-specific Playwright failures; `data-explore-lcp` removed client-side after mount (same pattern as morph LCP).

---

## 4. International Explore SEO (Option A)

| URL | Status | Canonical | hreflang |
| --- | ---: | --- | ---: |
| `/explore` | 200 | `https://mysaloon.uz/explore` | uz + cluster |
| `/ru/explore` | 200 | `…/ru/explore` | ru + cluster |
| `/en/explore` | 200 | `…/en/explore` | en + cluster |

- Hairstyle detail URLs remain **`/explore/{id}`** (62 models, identifiers unchanged).
- Sitemap: `staticSitemapUrls()` now emits three explore URLs (`trilingual: true`).
- RU/EN copy expanded (not empty stubs).

---

## 5. Performance

### Lab (hybrid branch, Nitro `:3003`, 3-run median)

| Metric | Explore mobile |
| ---: | ---: |
| Performance | **57** |
| LCP | **11425 ms** |
| FCP | **6695 ms** |
| CLS | **0.068** |
| TBT | **127 ms** |
| TTFB | **6 ms** |
| SEO / A11y | **100** / **100** |

Raw: `docs/mysaloon-v3-qa/lighthouse-hybrid-ssr/explore-run{1,2,3}.json`, [`manifest.json`](mysaloon-v3-qa/lighthouse-hybrid-ssr/manifest.json).

### Context (not identical environment)

| Source | Explore mobile LCP |
| --- | ---: |
| Live prod (`lighthouse-live-prod`) | **6627 ms** |
| Pre-change local lab (`lighthouse/manifest.json`) | **~11461 ms** median |
| Hybrid branch local lab | **~11425 ms** |

**Interpretation:** Static explore shell improves **first-byte HTML** and crawler-visible catalog; Lighthouse **scored LCP** still tracks post-JS paint. **Target LCP ≤2.5s not achieved.**

### Bundle

No intentional shared-chunk diet in this pass; explore route remains ~10 kB gzip (prior `bundle-sizes.json` baseline applies).

---

## 6. Regression & security

| Suite | Result |
| --- | --- |
| `npm test` (apps/user) | **98 passed**, 3 skipped |
| `content_seo` | **4/4** |
| Playwright `e2e/seo.spec.ts` | **4/4** (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003`) |
| `tsc --noEmit` | **91 errors** (baseline unchanged) |
| Scanner / polish Playwright | **Not re-run** in this pass (timebox; no regressions in touched paths) |

**Security / privacy:** SSR injection uses public API catalog + registry copy only — no tokens, phones, selfies, or scan history in HTML. Personalized routes remain `noindex` or client-only.

**Hardware camera QA:** Still **not claimed**.

---

## 7. Remaining risks

| Risk | Severity |
| --- | --- |
| Full DB backup still not executed on prod | **Medium** |
| Mobile LCP targets | **Medium** (structural `ssr: false` + ~290 kB gzip initial JS) |
| Route-level React SSR expansion (Phase 7) | **High** until public root split exists |
| Physical scanner QA | **Medium** |

---

## 8. Changed source files

| Path | Change |
| --- | --- |
| `apps/user/src/routes/$locale.explore.tsx` | New localized explore route |
| `apps/user/src/routes/explore.tsx` | Registry head + shared page |
| `apps/user/src/components/explore/ExploreRoutePage.tsx` | Shared UI + locale sync |
| `apps/user/src/lib/explore-lcp-shell.server.ts` | Visible pre-JS hero |
| `apps/user/src/lib/explore-prerender.server.ts` | Catalog snapshot HTML |
| `apps/user/src/lib/explore-lcp-static.ts` | Locale path matching |
| `apps/user/src/lib/seo-html-inject.server.ts` | Explore-rich prerender |
| `apps/user/src/server.ts` | Explore shell injection |
| `apps/user/src/seo/content/landings.ts` | `trilingual: true`, RU/EN copy |
| `apps/user/src/seo/seo.test.ts` | Explore hreflang + sitemap tests |
| `apps/user/e2e/seo.spec.ts` | Localized explore HTTP checks |
| `deploy/vps/pre-release-backup.sh` | Full DB gate |
| `deploy/vps/pg-backup-once.sh` | VPS pg_dump helper |
| `docs/MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md` | Ops runbook |

---

## 9. Git & release recommendation

- **Do not deploy** this branch to production without:
  1. Owner-approved **full `pg_dump`** (or provider snapshot).
  2. §9 device scanner checklist.
  3. Explicit acceptance of LCP posture or follow-up public-root SSR split.

**Stop for owner review** — merge to `main` and VPS deploy require separate approval.

**Final Git commit:** `b91c91d7` on `feat/mysaloon-selective-ssr` (pushed to `origin`).