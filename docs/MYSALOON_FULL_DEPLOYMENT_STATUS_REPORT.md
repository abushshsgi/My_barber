# MySaloon — full production deployment status audit

**Date:** 2026-11-28  
**Scope:** Read-only audit. No merge, deploy, restart, publish, or DB writes. Port 8000 untouched locally.

## Executive summary

| Surface | Live commit / build | Git reference | Last change (VPS, +05) |
| --- | --- | --- | --- |
| **User frontend** (Nitro `:3000` → nginx) | `1a401c70a4910a04112783b7d2c0a220b0bfc6d7` | `buildId` **1a401c7** (`2026-11-25T14:02:57Z`) | Deployed **2026-11-25 19:05** |
| **Django API** (`mysaloon.service` → `:8000`) | `f0573e3905eb3e89c2112db20c916b7bd6775eed` | Same as **`origin/main`** tip | Service restarted **2026-11-27 15:51** |
| **Latest dev (V3)** | `b6f3b9e5` on `feat/mysaloon-v3-ecosystem` | **12 commits** ahead of live frontend; **9 commits** ahead of `main` | Not deployed |

**Critical finding:** Production is **split-brained**. The API on `main` (Scanner V2 backend) was deployed **2026-11-27**, while the user web app still runs **`1a401c70` from 2026-11-25** — **three `main` commits behind**, including the full **Smart Scanner V2 frontend** (`f0573e39`). Users may get **old scanner UI against new scanner APIs**.

**Production ≠ `main` for the customer-facing web app.** Auto-deploy on `main` push applies only when CI/VPS frontend deploy runs; backend `deploy-backend.sh` pulls `main` independently.

---

## 1. Git repository audit

### Branch tips (after `git fetch origin`)

| Branch | Tip commit | One-line subject |
| --- | --- | --- |
| `main` / `origin/main` | `f0573e39` | Implement Universal Smart Scanner V2 on the Hair Advisor pipeline. |
| `feat/mysaloon-v3-ecosystem` | `b6f3b9e5` | Fix home desktop CLS and explore LCP targeting with measured Lighthouse evidence. |
| `feat/scanner-v2-release-candidate` | `38fabe6a` | docs: SEO production completion report and verification script |
| `feat/seo-phase1-content` | `1daecf14` | Rewrite Phase 1 guides as drafts and give them a readable article page. |

### Ancestry and merge status

- **`main` is ancestor of `feat/mysaloon-v3-ecosystem`:** yes (`merge-base` = `f0573e39`).
- **Commits on V3 not on `main`:** 9 (from `1daecf14` through `b6f3b9e5`).
- **Commits on `main` not on live frontend (`1a401c70`):** 3 — `3cc9ba1f`, `f0327afd`, `f0573e39`.
- **`feat/seo-phase1-content`:** 1 commit (`1daecf14`); **fully contained** in `feat/mysaloon-v3-ecosystem`; **not** on `main`.
- **`feat/scanner-v2-release-candidate`:** Scanner **code** is on `main` (`f0573e39`); branch tip **`38fabe6a`** is **one docs-only commit** ahead of `f0573e39` (not merged to `main`).

### Commits on `main` since live frontend (user-visible)

```
f0573e39 Implement Universal Smart Scanner V2 on the Hair Advisor pipeline.
f0327afd docs: note VPS deploy pending for mobile perf release
3cc9ba1f Improve mobile FCP/LCP: route-scoped try-on hero, slimmer initial JS.
```

### Commits on V3 since live frontend (additional to above)

```
b6f3b9e5 Fix home desktop CLS and explore LCP targeting …
d5759810 Close V3 release blockers: prod Lighthouse, scan history E2E, hreflang …
e77a8855 V3 production performance: prod Lighthouse, bundle split, Playwright auth …
b8a02c4f Complete V3 verification: i18n, Playwright, release readiness …
f057d1e9 Fix V3 polish defects: scanner state, i18n, layout, SEO dedupe …
356e5beb Record the V3 visual review without changing product UI.
55627548 Connect hairstyle pages to related styles and published guides.
086bf4cf Open guides and the hairstyle catalog to full tablet width.
1daecf14 Rewrite Phase 1 guides as drafts and readable article page.
```

### Local workspace (this machine)

- Checked out: `feat/mysaloon-v3-ecosystem` (tracks `origin`, clean aside from untracked QA artifacts).
- **No unpushed commits** on the tracked branch from this audit session.
- Untracked local-only: `apps/user/android/`, lighthouse JSON, sqlite QA DBs, etc. — not production.

---

## 2. Actual production VPS audit

**Access:** SSH host `mysaloon` (`89.45.45.32`, key `~/.ssh/mysaloon_vps`). No secrets read from `.env`.

### Services and paths

| Component | Path / unit | Status |
| --- | --- | --- |
| User web (TanStack Start / Nitro) | `/opt/mysaloon/Mybarber/apps/user`, `mysaloon-user.service`, `127.0.0.1:3000` | **active** |
| Django API | `/var/www/mysaloon/source`, `mysaloon.service`, `127.0.0.1:8000` | **active** |
| Nginx | `mysaloon.uz` → proxy `:3000`; `api.mysaloon.uz` → `:8000` | HTTP/2 TLS |
| Deployed SHA file | `/var/lib/mysaloon/deployed-sha` → `1a401c70…` | Matches frontend git HEAD |

### Deploy timestamps

- Frontend git commit date: **2026-11-25 19:02 +05**
- `deployed-sha` mtime: **2026-11-25 19:05 +05**
- Backend git commit date: **2026-11-27 12:36 +05**
- `mysaloon.service` `ActiveEnterTimestamp`: **2026-11-27 15:51 +05**
- `mysaloon-user.service` `ActiveEnterTimestamp`: **2026-11-25 19:05 +05**

### Django migrations (`content_seo` on production DB)

```
[X] 0001_initial
[X] 0002_seed_seo_article_drafts
```

**Not applied on production:** `0003_article_editorial_fields`, `0004_phase1_article_copy`, `0005_phase1_locale_editorial` (exist only on `feat/mysaloon-v3-ecosystem`, not on `main`).

### Live HTTP evidence

| Check | Result |
| --- | --- |
| `GET https://api.mysaloon.uz/health/` | `200` — redis + realtime OK |
| `GET https://mysaloon.uz/version.json` | `{"buildId":"1a401c7","builtAt":"2026-11-25T14:02:57.515Z"}` |
| `GET https://api.mysaloon.uz/api/v1/content/articles/` | `[]` (no published articles) |
| `GET https://api.mysaloon.uz/api/v1/hairstyles/` | **62** models returned |
| `GET https://mysaloon.uz/sitemap-blog.xml` | Empty `urlset` |
| `GET https://mysaloon.uz/en/explore` | **404** |
| Initial HTML `ssr` flag in TSR manifest | **`ssr:false`** on `/`, `/explore`, `/guides` (client shell + hidden `seo-prerender`) |

Homepage HTML (2026-11-28): `BUILD="1a401c7"`, hreflang uz/ru/en on `/`, canonical present, morph LCP static shell present (pre–`3cc9ba1f` behavior on non–`/ai-style` routes depends on inline script — prod home includes `morph-lcp-static` div).

---

## 3. Feature-by-feature deployment matrix

Legend: **D+V** = deployed and verified on live stack · **D?** = deployed, limited verification · **IMP** = implemented in repo, not on live user build · **PART** = split (e.g. API yes, UI no) · **N/A** = not in scope on prod branch.

| Feature | Status | Evidence |
| --- | --- | --- |
| **MySaloon V1** (core salon map, booking, auth) | **D+V** | Live site 200; API health OK; longstanding routes in `1a401c70` ancestry |
| **Scanner V2 initial** (`2ed51de2` era) | **D+V** | Ancestor of prod FE |
| **Scanner V2 Release Candidate** (gallery decode, docs `38fabe6a`) | **PART** | Backend **`f0573e39`** on VPS; **frontend still `1a401c70`** — V2 UI/hooks **not** deployed |
| **Barcode detection improvements** (shared `@mybarber/scanner`) | **PART** | On `main` backend; **not** in live JS bundle |
| **Gallery barcode decoding** (`af6e565d`) | **PART** | Same split |
| **Product resolver / advisor integration** | **PART** | `GET …/products/barcode/{code}/` → **401** without auth (API exists); web flow on old bundle |
| **Smart Scanner** (`use-smart-scanner.ts`, overlay) | **PART** | **IMP** on `main` FE; **not** on prod `1a401c7` |
| **Scan history** | **D?** | Backend paths exist; E2E proof on V3 branch only — prod FE/API mismatch risk |
| **Hair Advisor** | **D+V** | Routes live; ingredient landing SEO HTML with hreflang |
| **Morf AI / try-on** | **D+V** | Catalog + try-on routes in deployed build |
| **Image SEO** (`ed5bf270`) | **D+V** | In prod FE ancestry |
| **Catalog SEO / explore prerender** | **D+V** | Explore HTML: canonical, Service schema, H1 in `seo-prerender` |
| **Content SEO app** (`content_seo`) | **D?** | App on API; only migrations **0001–0002**; articles API **[]** |
| **SEO Phase 1 articles** (rewritten drafts) | **IMP** | Migrations **0003–0005** + copy on V3 only; **404** if unpublished |
| **Guides listing** | **D+V** | `GET /guides` **200**, title “Qo'llanmalar…” |
| **Article detail** (published) | **N/A** | No published articles in API |
| **Explore catalog UI** | **D+V** | Route live; 62 models from API |
| **Hairstyle detail** | **D+V** | API + explore routes (verify individual slug on demand) |
| **62 hairstyle models** | **D+V** | API count **62** on production |
| **V3 responsive / tablet width** (`086bf4cf`) | **IMP** | Not in `1a401c70` |
| **V3 UI polish** (`f057d1e9`, `356e5beb`) | **IMP** | V3 branch only |
| **UZ/RU/EN localization (path routes)** | **PART** | Homepage hreflang **D+V**; **`/en/explore` → 404** on prod |
| **Hreflang fixes** (V3 article fixture) | **IMP** | `d5759810` on V3; prod scanner landing has hreflang |
| **Sitemap fixes** | **D?** | Blog sitemap empty; image/sitemap work partially in `ed5bf270` — blog empty consistent with no published posts |
| **Article serializer optimization** | **IMP** | V3 / backend ahead of prod DB schema for Phase 1 |
| **Performance: mobile FCP/LCP** (`3cc9ba1f`) | **IMP** | On `main`, **not** deployed to VPS user app |
| **Performance: V3 CLS/LCP** (`b6f3b9e5`, bundle split) | **IMP** | V3 only; prod build **1a401c7** |

---

## 4. Production vs `feat/mysaloon-v3-ecosystem`

Users on **mysaloon.uz** today **cannot** access (until unified frontend + optional backend migrate deploy):

- V3 homepage desktop CLS fix and measured Explore LCP work (`b6f3b9e5`).
- Production Lighthouse bundle splits (`vendor-zxing` route scope, explore chunk sizing) from `e77a8855` / `d5759810`.
- Full **locale path routing** for explore and guides (`/en/...`, `/ru/...`) — **404** on prod for `/en/explore`.
- Tablet/full-width guides and explore layouts.
- Hairstyle ↔ guides cross-links and related-style blocks.
- Phase 1 **rewritten article body** and editorial migrations (**DB not migrated** on VPS).
- **`main` scanner V2 web UX** (overlay, smart scanner, removed legacy pages) — **backend already updated**.
- **`3cc9ba1f` morph LCP shell** route scoping for home vs try-on.

Local V3 docs baseline (for post-deploy comparison): homepage desktop CLS **0.043**, Performance **~80**; Explore mobile LCP still **~6.7–11.5s** in lab (`docs/MYSALOON_V3_PRODUCTION_PERFORMANCE_REPORT.md`).

---

## 5. Safe integration and deployment plan (proposal)

**Do not execute without owner approval.**

### Recommended branch integration order

1. **Reconcile frontend with `main` first** (close split-brain)
   - Deploy user app at least to **`f0573e39`** (Scanner V2 FE + backend alignment).
   - Run smoke: Hair Advisor scan flow, history list, Morf AI, explore — **physical camera QA still required**.

2. **Merge or deploy `feat/mysaloon-v3-ecosystem` as a single release candidate**
   - Prefer **merge to `main` after review** OR VPS `git checkout`/`pull` of the feature branch with pinned SHA `b6f3b9e5`.
   - **Do not** merge Scanner V2 RC docs-only tip separately unless desired (`38fabe6a`).

3. **`feat/seo-phase1-content`**
   - **No separate merge needed** if V3 branch is deployed (commit already in V3).

4. **`feat/mysaloon-selective-ssr`** (future)
   - Not started in this audit; branch from `b6f3b9e5` per separate architecture mission.

### Conflicts / dependencies

| Item | Notes |
| --- | --- |
| Scanner V2 RC | Code on `main`; RC branch = +1 doc commit |
| V3 + `main` | V3 is **fast-forward from `main`** — expect **low Git conflict**; risk is **runtime** (migrations, QA) |
| Backend migrations | V3 needs **`content_seo` 0003–0005** before article preview in staging; **still no publish** until editorial sign-off |
| Frontend env | VPS `API_UPSTREAM_URL=https://api.mysaloon.uz` in `mysaloon-user.service` |

### Deployment sequence (staging → prod)

1. **Backup:** DB snapshot, `/var/lib/mysaloon/deployed-sha`, nginx sites.
2. **Backend:** pull target SHA → `migrate --noinput` → restart `mysaloon.service` → `/health/`.
3. **Frontend:** `deploy-frontends.sh all` (or `user` only) from target SHA → verify `dist/client/version.json` → restart `mysaloon-user` → `nginx -t && reload`.
4. **Smoke tests:** health, version.json buildId, `/explore`, `/guides`, `/morf-ai/ingredient-scanner`, `/en/explore` (post-V3), auth login, scan history API (authenticated), empty public articles still `[]`.
5. **Regression:** Vitest, Django `content_seo`, Playwright scanner/SEO/polish — run in CI or lab against staging URL.
6. **Rollback:** restore previous SHA in `/opt/mysaloon/Mybarber` + redeploy prior `dist`; restore DB if migrate ran; reset `deployed-sha`.

### Release blockers (current)

- Frontend/backend **version skew** on Scanner V2.
- V3 **not merged** to `main` or deployed.
- Phase 1 articles **draft**; migrations **0003–0005** absent on prod DB.
- **Physical device** camera/barcode QA not claimed from HTTP audit.
- Owner approval required before merge, publish, or unified V3 cutover.

### Is production ready for a unified V1+V2+V3 release?

**No.** Ready after: (1) align user FE with `main`, (2) deploy V3 SHA with migrations in staging, (3) pass smoke + Playwright + owner sign-off, (4) explicit publish decision for articles (still optional and separate).

---

## 6. Selective SSR mission (deferred)

The **hybrid SSR architecture** work (`feat/mysaloon-selective-ssr` from `b6f3b9e5`) was **not started** in this read-only audit pass. Production confirms **`ssr: false`** globally with Nitro SSR server still serving a **client-first shell**. Proceed only after this deployment report is reviewed and SSR branch work is explicitly approved.

---

## Evidence files (local, not committed)

- `tmp-prod-explore.html`, `tmp-prod-guides.html`, `tmp-prod-home.html`, `tmp-prod-scanner.html` — fetched 2026-11-28.
- VPS: `/var/lib/mysaloon/deployed-sha`, `version.json` on server.

**Audit performed by:** automated repo + VPS inspection  
**Final restriction honored:** no deploy, merge, or production mutations in this session.