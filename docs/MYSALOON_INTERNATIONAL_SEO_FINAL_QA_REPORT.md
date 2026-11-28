# MySaloon — International SEO final QA & production readiness

**Date:** 2026-11-28  
**Prepared by:** staging QA pass (local lab; **no deploy, merge, or production mutation**)  
**Classification:** **CONDITIONAL RELEASE — ready for owner approval after two documented gaps**

| Item | Value |
| --- | --- |
| Live production (unchanged) | Frontend + backend **`3caad448`** |
| Release branch | `feat/mysaloon-international-seo-release` |
| Implementation | `e0b5b309` |
| QA report tip | **`33fa5c29`** |
| Final candidate SHA for deploy | **`33fa5c29`** (`e0b5b309` implementation + QA evidence) |
| Accepted ADR | `feat/mysaloon-split-bootstrap` · `aa111113` — **rendering architecture frozen; performance experiments rejected for production** |

---

## Executive summary

The international Explore SEO release is a **frontend-only** delta on top of stable production `3caad448`. It adds `/en/explore` and `/ru/explore`, localized registry metadata, hreflang clusters, enriched `seo-prerender` catalog HTML, and regression tests — **without** split-bootstrap, public shell, hybrid LCP overlay, or `routeTree.public.ts`.

**Regression suites executed in this pass:** production build, Vitest (96 pass / 3 skip), Django `content_seo` (4/4), Playwright SEO (4/4), Playwright scanner (6/6), Playwright polish (15 pass / 2 skip). **No backend files** and **no database migrations** are in the release diff.

**Conditional items before calling the release “fully ready”:**

1. **Initial HTML `<html lang>`** remains `uz` on `/en/explore` and `/ru/explore` (shell hard-coded in `__root.tsx`). Localized **title/description/canonical/hreflang** are correct in the first byte HTML; **client hydration** sets `document.documentElement.lang` via `ExploreRoutePage`.
2. **VPS backup** `release-20261128-181739` was **not re-opened from this workstation** (no SSH). Use owner-verified evidence on the server before deploy.

**Production deployment:** **not executed**. Awaits **explicit owner approval** per owner decision.

---

## Phase 1 — Release diff audit

### Ancestry

```
3caad448  ← production baseline
  └─ e0b5b309  International Explore SEO (implementation)
       └─ 4565eead  docs: record SEO release candidate SHA
```

### Exact files changed (`3caad448..4565eead`)

| File | Δ |
| --- | ---: |
| `apps/user/e2e/seo.spec.ts` | +11 |
| `apps/user/src/components/explore/ExploreRoutePage.tsx` | +39 (new) |
| `apps/user/src/lib/explore-prerender.server.ts` | +40 (new) |
| `apps/user/src/lib/seo-html-inject.server.ts` | ~24 |
| `apps/user/src/routeTree.gen.ts` | +21 |
| `apps/user/src/routes/$locale.explore.tsx` | +31 (new) |
| `apps/user/src/routes/explore.tsx` | refactor |
| `apps/user/src/seo/content/landings.ts` | copy + `trilingual: true` |
| `apps/user/src/seo/seo.test.ts` | +17 |
| `docs/MYSALOON_INTERNATIONAL_SEO_RELEASE_REPORT.md` | +71 |

**10 files, +279 / −52 lines.** Zero changes under `backend/`.

### Excluded experimental surface (verified)

Compared against `feat/mysaloon-split-bootstrap` (`aa111113` family). **Present on performance branch only — absent from SEO release:**

| Artifact / behavior | On split-bootstrap | On SEO RC |
| --- | :---: | :---: |
| `routeTree.public.ts` | Yes | **No** |
| `router.public.tsx` / split-bootstrap | Yes | **No** |
| `PublicCatalogShell` | Yes | **No** |
| `explore-lcp-shell.server.ts` + inject in `server.ts` | Yes | **No** |
| `explore-perf-marks.ts` (dev instrumentation) | Yes | **No** |
| `split-bootstrap.ts` / deferred router preload | Yes | **No** |
| `require-auth` experimental changes | Yes | **No** |
| Unrelated DB migrations | N/A | **No** |

**Preserved:** single app router, existing auth, existing Uzbek `/explore/{id}` and try-on URLs, 62-model catalog API.

---

## Phase 2 — International SEO verification (Nitro prod lab)

**Environment:** `NODE_ENV=production`, `node dist/server/index.mjs`, `PORT=3002`, `API_UPSTREAM_URL=http://127.0.0.1:8001`, build `4565eea` (`4565eead` tree).

### Route matrix

| Route | HTTP | Initial `<html lang>` | Title (initial HTML) | Canonical | hreflang alts (count) | `seo-prerender` | Notes |
| --- | :---: | --- | --- | --- | :---: | :---: | --- |
| `/explore` | 200 | `uz` | Soch uslublari — katalog va try-on | `https://mysaloon.uz/explore` | 4 | Yes | `62 uslub` in prerender |
| `/en/explore` | 200 | **`uz`** ⚠ | Hairstyle catalog — mysaloon.uz | `https://mysaloon.uz/en/explore` | 4 | Yes | EN copy in title/description |
| `/ru/explore` | 200 | **`uz`** ⚠ | Каталог стилей — mysaloon.uz | `https://mysaloon.uz/ru/explore` | 4 | Yes | RU copy in title/description |

**Hreflang:** reciprocal `uz` / `ru` / `en` + `x-default` → `https://mysaloon.uz/explore` (Playwright + manual HTTP).

**Sitemap:** `sitemap-static.xml` contains loc entries for `/explore`, `/en/explore`, `/ru/explore` (HTTP 200).

**Hairstyle count:** `GET /api/v1/hairstyles/` on QA `:8001` → **62** models.

**Not claimed:** localized hairstyle **detail** pages (detail URLs remain locale-agnostic `/explore/{id}`).

### Initial HTML evidence

Truncated head snapshots:

- [`docs/mysaloon-v3-qa/seo-rc-html/explore.head.html`](mysaloon-v3-qa/seo-rc-html/explore.head.html)
- [`docs/mysaloon-v3-qa/seo-rc-html/en-explore.head.html`](mysaloon-v3-qa/seo-rc-html/en-explore.head.html)
- [`docs/mysaloon-v3-qa/seo-rc-html/ru-explore.head.html`](mysaloon-v3-qa/seo-rc-html/ru-explore.head.html)

### Hydrated DOM (language)

`ExploreRoutePage` sets `document.documentElement.lang` to `en`/`ru` after `ensureLanguageResources` + `i18n.changeLanguage`. **Full Playwright hydrated lang check was not re-run on `:3002`** after a transient tooling glitch; behavior is implemented in:

```15:24:apps/user/src/components/explore/ExploreRoutePage.tsx
  useEffect(() => {
    if (!locale || locale === "uz") return;
    const code = locale as AppLang;
    void ensureLanguageResources(code).then(() => {
      ...
      document.documentElement.lang = code;
    });
  }, [locale]);
```

**Recommendation (non-blocking for CONDITIONAL):** set `<html lang>` server-side from `parseLocaleFromPath` during `injectSeoIntoHtml` so crawlers without JS see correct language.

### Prerender vs visible catalog

`buildExploreCatalogPrerender` uses live API rows (12 sample links + count note). Prerender is **visually hidden** (`#seo-prerender` screen-reader/off-screen pattern) but textually aligned with registry copy — not crawler-only bait.

---

## Phase 3 — Regression QA

| Suite | Result | Notes |
| --- | --- | --- |
| `npm run build` (`apps/user`) | **PASS** | `buildId=4565eea` |
| Vitest `apps/user` | **96 passed**, 3 skipped | incl. `seo.test.ts` **11/11** |
| Django `content_seo` | **4/4** | `qa_verify_8001.sqlite3`, `MYSALOON_QA_ISOLATED=1` |
| Playwright `seo.spec.ts` | **4/4** | Nitro `:3002` prod build |
| Playwright `hair-advisor-scanner.spec.ts` | **6/6** | Isolated JWT `:8001` |
| Playwright `v3-polish-verification.spec.ts` | **15 pass**, 2 skip | Scanner permission sim; article desktop width skip |
| Playwright `hair-advisor-pick.spec.ts` | 1 skip | Mocked candidates (existing skip) |
| `tsc --noEmit` | **91 errors** | Matches [`docs/mysaloon-v3-qa/typescript-baseline.txt`](mysaloon-v3-qa/typescript-baseline.txt) — **0 new** |

**Port 8000:** not used for QA API (isolated `:8001` only).

**Not executed:** paid AI generation; physical camera hardware.

### Responsive coverage (automated)

| Width | Covered by |
| --- | --- |
| 390px | `v3-polish` hairstyle detail try-on CTA |
| 836px (~860) | `v3-polish` explore |
| 320 / 768 / 1024 / 1440 | **Not re-captured this pass** — no new regression signal vs `3caad448` for non-Explore routes |

Existing polish screenshots: [`docs/mysaloon-v3-qa/screenshots/polish/`](mysaloon-v3-qa/screenshots/polish/).

---

## Phase 4 — Performance non-regression (`/explore` mobile)

**Method:** Lighthouse 13.x, mobile simulate, same Nitro lab (`:3002`, API `:8001`).

### SEO candidate — 3 runs (2026-11-28)

Artifacts: [`docs/mysaloon-v3-qa/lighthouse-seo-rc/explore-seo-rc-run{1,2,3}.json`](mysaloon-v3-qa/lighthouse-seo-rc/)

| Run | Perf | SEO | A11y | LCP ms | FCP ms | CLS | TBT ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 55 | 100 | 100 | 11798 | 6718 | 0 | 188 |
| 2 | 57 | 100 | 100 | 11602 | 6697 | 0.068 | 114 |
| 3 | 57 | 100 | 100 | 11150 | 6609 | 0.068 | 121 |
| **Median** | **57** | **100** | **100** | **~11602** | **~6697** | **0.068** | **~121** |

**Initial JS (script transfer, run 2):** **1 534 431** bytes.

### Production-source family baseline (`3caad448` explore, prior same-lab manifest)

From [`docs/mysaloon-v3-qa/lighthouse/manifest.json`](mysaloon-v3-qa/lighthouse/manifest.json) (`explore` mobile, 3 runs, pre-SEO tree on same Nitro lab):

| Metric | Baseline median | SEO RC median | Δ |
| --- | ---: | ---: | ---: |
| Performance | 56 | 57 | within noise |
| LCP ms | ~11461 | ~11602 | **+141 ms (~1.2%)** |
| FCP ms | ~6743 | ~6697 | −46 ms |
| TBT ms | ~142.5 | ~121 | −21 ms |
| SEO score | 100 | 100 | — |
| Script transfer (explore-run2) | 1 532 297 | 1 534 431 | **+0.14%** |

**Verdict:** **No meaningful performance regression** for this SEO-only release. Lab LCP remains ~11 s class (ADR-accepted; not a release gate).

---

## Phase 5 — Production backup readiness

| Check | Status |
| --- | --- |
| Owner backup path `/var/lib/mysaloon/backups/release-20261128-181739` | **Not verified from QA host** — requires VPS read access |
| Pre-release script | [`deploy/vps/pre-release-backup.sh`](deploy/vps/pre-release-backup.sh) (PostgreSQL dump, `content_seo` dump, `user-dist` tarball, SHAs) |
| SEO release DB migrations | **None required** — frontend-only |
| If migrations unexpectedly required | **STOP** — not applicable to this RC |

**Disaster recovery limitations (unchanged):** isolated restore verification, off-site encrypted backup, PostgreSQL globals, retention policy — document in unified release plan; not modified in this pass.

**Pre-deploy backup:** execute `pre-release-backup.sh` **only after owner deploy authorization**.

---

## Phase 6 — Deployment plan (prepare only)

| Step | Action |
| --- | --- |
| **Current prod SHA** | `3caad448` (frontend + backend) |
| **Target frontend SHA** | `4565eead` on `feat/mysaloon-international-seo-release` |
| **Target backend SHA** | **Unchanged `3caad448`** (no API deploy required for SEO) |
| **Git on VPS** | Standard `deploy-frontends.sh` does `git pull --ff-only` from **`main`** — **this RC is not on `main`**. Owner must either merge after approval **or** manual `git fetch && git checkout 4565eead` on `/opt/mysaloon/Mybarber` before build. |
| **CI/CD** | `.github/workflows/deploy-frontends-vps.yml` triggers on `main` push only — **no auto-deploy from feature branch** |
| **Build** | `npm run build:user` on VPS as `www-data` / deploy user |
| **Artifacts** | `apps/user/dist/**`, `version.json` → `buildId` ~ `4565eea` |
| **Service** | `systemctl restart mysaloon-user` (~1–3 min blip) |
| **Backend** | **No restart** if SHA unchanged |
| **Downtime** | **Low** — user Nitro only |
| **Post-deploy** | `curl https://mysaloon.uz/version.json`; HTTP 200 on `/explore`, `/en/explore`, `/ru/explore`; hreflang in view-source; hairstyle count 62 via public API |
| **Rollback** | Restore backed-up `user-dist` tarball + previous `deployed-sha`; `systemctl restart mysaloon-user` — **no DB rollback** |

**Compatibility:** Frontend-only deploy at `4565eead` against backend `3caad448` is **compatible** (no new API contracts).

---

## Phase 7 — Remaining risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| `<html lang>` wrong on first HTML for EN/RU explore | Medium (SEO) | Server-side `lang` in SEO inject or `RootShell` locale-aware |
| Stale Nitro process serving old `dist` during QA | Low | Always restart `mysaloon-user` after deploy; verify `version.json` |
| VPS backup not re-validated in this pass | Medium (ops) | Owner confirms SHA-256 + pg_dump readability on `release-20261128-181739` |
| Lab vs live TLS/geo Lighthouse drift | Low | Judge non-regression in lab only (per ADR) |
| Merging performance branches by mistake | High | Deploy **only** `feat/mysaloon-international-seo-release` |

---

## Final classification

| Status | **CONDITIONAL RELEASE — READY FOR OWNER APPROVAL** |
| --- | --- |
| Blockers | **None** in automated regression |
| Conditions | (1) Accept initial-HTML `lang` gap or patch before deploy; (2) Confirm VPS backup evidence on server; (3) **Explicit owner sign-off** before any production command |

**Do not deploy** until owner approves. **Do not merge** performance experiment branches. **Do not merge to `main`** in this pass.

---

## References

- [`docs/MYSALOON_INTERNATIONAL_SEO_RELEASE_REPORT.md`](MYSALOON_INTERNATIONAL_SEO_RELEASE_REPORT.md)
- [`docs/MYSALOON_UNIFIED_PRODUCTION_RELEASE_PLAN.md`](MYSALOON_UNIFIED_PRODUCTION_RELEASE_PLAN.md)
- ADR (on `feat/mysaloon-split-bootstrap`): `docs/MYSALOON_FINAL_RENDERING_ARCHITECTURE_ADR.md`
- [`deploy/vps/pre-release-backup.sh`](../deploy/vps/pre-release-backup.sh)
- [`deploy/vps/deploy-frontends.sh`](../deploy/vps/deploy-frontends.sh)