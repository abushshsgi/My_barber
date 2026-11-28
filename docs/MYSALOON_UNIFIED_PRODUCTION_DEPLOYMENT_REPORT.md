# MySaloon — unified production deployment report

**Date:** 2026-11-28  
**Verdict:** **SUCCESS** (coordinated V1+V2+V3 release live; see caveats below)  
**Release SHA (Git):** `3caad4483933c7fa36895303f00a9e769a626e17`  
**Production build ID:** `3caad44` (`https://mysaloon.uz/version.json`)

---

## Version summary

| Layer | Before | After |
| --- | --- | --- |
| Frontend Git (VPS `/opt/mysaloon/Mybarber`) | `1a401c70` | **`3caad448`** |
| Backend Git (VPS `/var/www/mysaloon/source`) | `f0573e39` | **`3caad448`** |
| Frontend `buildId` | `1a401c7` | **`3caad44`** |
| `deployed-sha` | `1a401c70…` | **`3caad448…`** |

**Mismatch resolved:** frontend and backend now share the same monorepo SHA.

**Merge:** fast-forward `main` from `f0573e39` → `b6f3b9e5` (V3), then docs commit `3caad448` on `main` (no force-push).

---

## Backup

| Item | Location / evidence |
| --- | --- |
| Backup directory | **`/var/lib/mysaloon/backups/release-20261128-154936`** |
| `user-dist.tar.gz` | **~36 MB** (pre-release `dist`) |
| `content_seo_dumpdata.json` | Present |
| SHAs + `version.json` + `deployed-sha` | In backup dir |

**Rollback (documented, not executed):**

```bash
# Frontend: restore dist from backup, restart mysaloon-user
tar -xzf /var/lib/mysaloon/backups/release-20261128-154936/user-dist.tar.gz -C /opt/mysaloon/Mybarber/apps/user
chown -R www-data:www-data /opt/mysaloon/Mybarber/apps/user/dist
systemctl restart mysaloon-user

# Backend: git checkout f0573e39 (or 1a401c70 for FE-only era) — do NOT auto-reverse DB migrations
cd /var/www/mysaloon/source && git checkout f0573e39 && systemctl restart mysaloon.service
```

---

## Deployment timeline (VPS, +05)

| Phase | Time (approx) | Notes |
| --- | --- | --- |
| Backup | 15:49 | `release-20261128-154936` |
| Backend pull + migrate + restart | 15:50–15:51 | Transient **`health=502`** during worker boot; **200** within ~10 s |
| Frontend `deploy-frontends.sh user` | 15:51–15:58 | `npm ci`/build ~7 min; nginx reload OK |
| Live verification | 15:58+ | Services **active** |

**Estimated user-facing blip:** nginx/proxy errors during `mysaloon-user` and `mysaloon.service` restarts — **&lt;1–2 minutes** each.

---

## Migrations

`content_seo` on production **after** deploy:

```
[X] 0001_initial
[X] 0002_seed_seo_article_drafts
[X] 0003_article_editorial_fields
[X] 0004_phase1_article_copy
[X] 0005_phase1_locale_editorial
```

Phase 1 rows updated as **draft** — public API unchanged.

---

## Pre-deploy QA (local, release tree)

| Check | Result |
| --- | --- |
| `npm run build:user` | **PASS** (`buildId=b6f3b9e` pre-docs; prod built `3caad44`) |
| Django `check` | **0 issues** |
| `content_seo` tests | **4/4** |
| Vitest | **94 pass**, 3 skip |
| Playwright (pre-deploy session) | scanner 6/6, SEO 3/3, polish 9/1 skip |
| `tsc --noEmit` | **91 errors** — matches baseline; **no new release-critical TS gate** |

---

## Production health (live evidence)

| Check | Result |
| --- | --- |
| `GET https://api.mysaloon.uz/health/` | **200** — redis OK |
| `mysaloon-user` / `mysaloon.service` | **active** |
| `GET https://mysaloon.uz/version.json` | `buildId: 3caad44` |
| Hairstyles API count | **62** |
| `GET …/content/articles/` | **`[]`** (drafts not published) |
| `GET /`, `/explore`, `/guides`, scanner landing | **200** |
| `GET /en/guides`, `/ru/guides` | **200** |
| `GET /en/explore`, `/ru/explore` | **404** — **no `$locale/explore` route in app** (hreflang home uses `/en/` not `/en/explore`; not a deploy regression) |

---

## Functional smoke (HTTP / shell, not physical camera)

| Area | Result |
| --- | --- |
| Homepage | **200**, `BUILD=3caad44` |
| Explore catalog | **200**, canonical `https://mysaloon.uz/explore` |
| Guides | **200** |
| Morf scanner landing | **200** |
| API + catalog | **62** models |
| Auth | Not exercised with credentials in this report (no secrets) |
| Smart Scanner / camera / barcode hardware | **NOT VERIFIED** on device (see below) |

---

## SEO verification (production)

| Check | Result |
| --- | --- |
| `robots.txt` | **200**, sitemap index URL present |
| `sitemap-blog.xml` | **200**, empty `urlset` (no published articles) |
| Explore canonical | Present on live HTML |
| Draft articles | Omitted from public API and blog sitemap |
| Localized guides | **`/en/guides`, `/ru/guides` 200** |

---

## Performance (live)

**Not measured** with Lighthouse on production CDN in this pass (post-deploy stability window). Prior lab evidence on V3 build remains in `docs/MYSALOON_V3_DEEP_PERFORMANCE_REPORT.md`. Mobile Performance **&lt;90** is a **known non-blocking** follow-up (Selective SSR **not** started).

---

## Remaining device QA

| Item | Status |
| --- | --- |
| Android barcode / camera | **NOT PERFORMED** |
| iOS barcode / camera | **NOT PERFORMED** |
| Gallery decode on real device | **NOT PERFORMED** |

**Not feature-gated** — Scanner V2 shipped with Playwright + simulated coverage; owner accepted release with documented device risk.

---

## Excluded / out of scope

- Phase 1 article **publish**
- Selective SSR
- V4 / redesign
- Port **8000** local — **not touched**

---

## Journal notes (backend)

- Post-restart: models in `accounts`, `control_panel` flagged as lacking migrations on server — **pre-existing**, not introduced by this release; **no migrate failure** on release migrations.

---

## Rollback status

**Not executed.** Backup verified at `release-20261128-154936`.

---

## Changed artifacts (this release)

- `main` @ `3caad448` (V3 ecosystem + release docs + `deploy/vps/pre-release-backup.sh`)
- Production VPS frontend + backend aligned to same SHA
- `content_seo` migrations **0003–0005** applied

---

## Final recommendation

**Production is on unified V1+V2+V3 at `3caad448`.** Complete **physical scanner QA** when hardware is available. Schedule **Selective SSR** and **mobile perf** separately. **Publish articles** only after explicit editorial approval.