# MySaloon — unified production release plan

**Prepared:** 2026-11-28  
**Scope:** Release preparation only — **no production deploy, merge, migrate, or publish executed in this pass.**  
**Port 8000:** untouched (Expo / local SQLite). Selective SSR: **out of scope** for this release.

---

## Final release recommendation

| Question | Answer |
| --- | --- |
| **Ship unified V1+V2+V3 now?** | **Conditional yes** — functionally ready after **owner approval** and **physical scanner QA**; not blocked on article publish. |
| **Target SHA** | **`b6f3b9e5`** (`feat/mysaloon-v3-ecosystem`) — includes all `main` Scanner V2 + 9 V3 commits. |
| **Two-step (`main` FE then V3)?** | **Not recommended** — one cut to **`b6f3b9e5`** fixes scanner skew and avoids a second deploy window. Emergency-only interim: frontend-only deploy to **`f0573e39`** if V3 must wait. |
| **Merge to `main` before VPS?** | **Recommended** — `deploy/vps/deploy-backend.sh` runs `git pull --ff-only origin main`. V3 backend migrations are **not** on `main` today. Alternative: owner-approved **manual** checkout of `b6f3b9e5` on **both** VPS clones (see §10). |

---

## 1. Current production versions (re-verified 2026-11-28)

| Surface | Commit | Build ID | VPS path | Service |
| --- | --- | --- | --- | --- |
| User frontend | `1a401c70` | `1a401c7` | `/opt/mysaloon/Mybarber` | `mysaloon-user.service` → `127.0.0.1:3000` |
| Django API | `f0573e39` | — | `/var/www/mysaloon/source` | `mysaloon.service` → `127.0.0.1:8000` |

**Mismatch:** **CONFIRMED** — backend = `main`; frontend = **12 commits behind V3**, **3 commits behind `main`**.  
Evidence: `/var/lib/mysaloon/deployed-sha`, live `https://mysaloon.uz/version.json`, `git rev-parse` on VPS.

**VPS health (read-only):** `mysaloon-user`, `mysaloon.service`, `nginx` **active**; disk **37%** used (~36 GiB free); **~2.5 GiB** RAM available; `GET /health/` **200**.

---

## 2. Proposed target versions

| Surface | Target commit | Build ID (local build) | Notes |
| --- | --- | --- | --- |
| User frontend | **`b6f3b9e5`** | **`b6f3b9e`** | `npm run build:user` **passed** 2026-11-28 |
| Django API | **`b6f3b9e5`** | — | Same monorepo; **`content_seo` 0003–0005** required |

**After deploy verification (post-approval only):**

```text
curl https://mysaloon.uz/version.json          → buildId "b6f3b9e" (or newer if rebuild)
ssh … git -C /opt/mysaloon/Mybarber rev-parse HEAD → b6f3b9e5…
ssh … git -C /var/www/mysaloon/source rev-parse HEAD → b6f3b9e5…
```

---

## 3. Phase 1 — release inventory

### Git state (fetched 2026-11-28)

| Branch | Tip | Notes |
| --- | --- | --- |
| `origin/main` | `f0573e39` | Scanner V2 on Hair Advisor pipeline |
| `origin/feat/mysaloon-v3-ecosystem` | `b6f3b9e5` | **Release candidate** — fast-forward from `main` + **9** commits |
| `feat/scanner-v2-release-candidate` | `38fabe6a` | **Docs only** (+1); scanner code already on `main` |
| `feat/seo-phase1-content` | `1daecf14` | **Contained in V3** — no separate merge |

### Confirmed

- Scanner V2 **code** on `main` at `f0573e39`.
- Scanner V2 RC tip = **documentation-only** (`38fabe6a`).
- SEO Phase 1 **included in V3** (`1daecf14`); drafts remain **draft** in DB after migrations.
- **No new commits** on `origin/feat/mysaloon-v3-ecosystem` since prior deployment audit (`b6f3b9e5` unchanged).

### V3 commits (not on production frontend)

`1daecf14` → `b6f3b9e5` (9 commits): Phase 1 article UI + migrations, tablet layouts, style↔guides links, V3 polish/i18n/performance, bundle split, hreflang proof, home CLS / explore LCP fixes.

### Do not cherry-pick

V3 is a **linear extension of `main`** — deploy or merge **one SHA**; no partial cherry-picks.

---

## 4. Included features (unified RC at `b6f3b9e5`)

| Area | In RC |
| --- | --- |
| V1 core (salon, booking, auth, wallet) | Yes (unchanged baseline) |
| Scanner V2 + Smart Scanner UI + gallery decode | Yes (from `main` + V3 polish) |
| Scan history (API + UI) | Yes |
| Hair Advisor + Morf AI | Yes |
| Guides + article **UI** (draft content) | Yes |
| Explore + 62 hairstyles + detail + try-on links | Yes |
| UZ / RU / EN path routes (e.g. `/en/explore`) | Yes (**absent on prod today**) |
| Image / catalog / content SEO, hreflang, sitemaps | Yes |
| Article list serializer (no `content` on list) | Yes (backend on V3 tree) |
| Responsive + home desktop CLS fix | Yes |
| Route-scoped ZXing / MediaPipe / Motion | Yes |
| Phase 1 **published** articles | **No** — still draft by design |
| Selective SSR | **No** — not in this release |

---

## 5. Phase 2 — production safety audit

| Check | Status |
| --- | --- |
| Frontend Nitro service | **active** (`WorkingDirectory=/opt/mysaloon/Mybarber/apps/user`) |
| Backend Django | **active** |
| Nginx → user `:3000`, API `:8000` | **active** |
| Both clones = same GitHub monorepo | **yes** |
| CI/CD | `.github/workflows/deploy-frontends-vps.yml` on **`main`** push only |
| Backend deploy script | `deploy/vps/deploy-backend.sh` — **`git pull origin main`** only |
| DB | **`DATABASE_URL`** on server (engine not printed; production Django with `content_seo` **0001–0002** applied) |
| Media / static | Standard Django + nginx static; **no migration of media** in this release |
| `content_seo` on prod | **0001, 0002** only — **0003–0005 pending** for V3 |

---

## 6. Phase 3 — backup and rollback

### Pre-deploy backup checklist (owner-approved execution)

| Asset | Procedure |
| --- | --- |
| **Database** | Full backup before `migrate` (e.g. `pg_dump` / provider snapshot — use existing host backup practice; **do not** commit dumps). Record timestamp + migration list (`showmigrations content_seo`). |
| **Frontend build** | `cp -a /opt/mysaloon/Mybarber/apps/user/dist /var/lib/mysaloon/backups/user-dist-$(date +%Y%m%d-%H%M)` (or tarball). |
| **Git SHAs** | Record `deployed-sha`, `git rev-parse HEAD` on **both** paths, `version.json`. |
| **Backend tree** | Tag or record `f0573e39` on `/var/www/mysaloon/source`. |
| **Nginx / systemd** | Copy current `/etc/nginx/sites-enabled/mysaloon-user.conf`, `mysaloon-user.service` if changed this release. |
| **Media** | No schema change to user uploads; **preserve** — backup optional unless migrate touches files (it does not). |

### Rollback (application)

| Scenario | Action |
| --- | --- |
| **Frontend bad build** | Restore backed-up `dist/`, `chown www-data`, `systemctl restart mysaloon-user`, reset `deployed-sha` to previous. **~1–3 min** user-facing blip. |
| **Backend bad code** | `git checkout f0573e39` (or prior SHA) on `/var/www/mysaloon/source`, restart `mysaloon.service`. **Do not** auto-reverse migrations. |
| **Migrations 0003–0005 applied, rollback desired** | **0003** reversible (drop columns). **0004** `reverse` deletes Phase 1 **ru/en** rows seeded for known slugs. **0005** forward re-seed only; reverse noop — **data** may need DBA review. **Prefer forward fix** over migrate reversal. |

### Rollback trigger examples

- `/health/` not 200 after 3 minutes  
- `mysaloon-user` crash loop  
- Elevated 5xx on `/api/v1/hair-advisor/` or auth  
- Owner abort  

---

## 7. Phase 4 — frontend alignment (`main` only) — optional interim

**Baseline:** `f0573e39` on `/opt/mysaloon/Mybarber` only.

**Purpose:** Stop scanner UI/API skew **without** V3 migrations or i18n.

**Local checks (if executed before prod):**

```bash
git checkout f0573e39
npm ci && npm run build:user
# Smoke: /morf-ai/ingredient-scanner, /ai-style/care/ingredient, login, /explore
```

**VPS commands (prepare only — not run):**

```bash
cd /opt/mysaloon/Mybarber && git fetch && git checkout f0573e39
sudo bash deploy/vps/deploy-frontends.sh user
```

**Compatibility:** Matches **current** production API (`f0573e39`). **Does not** add `/en/explore`, CLS fixes, or `content_seo` 0003–0005.

**Why skip if shipping V3:** Single deploy to `b6f3b9e5` supersedes this step.

---

## 8. Phase 5–6 — unified V3 RC and migrations

### Migration summary (`content_seo`)

| Migration | Type | Risk |
| --- | --- | --- |
| **0003** | Add fields (`cover_alt`, dimensions, `reviewed_by`, `sources`, `related_slugs`) | Low — additive |
| **0004** | `RunPython` `seed_phase1` | Updates Phase 1 **draft** copy; reverse deletes ru/en rows for Phase 1 slugs |
| **0005** | Re-run `seed_phase1` | Idempotent content refresh; reverse noop |

**Local test (this pass):** Fresh SQLite `qa_migrate_test.sqlite3` — **0001→0005 OK**; `manage.py test content_seo` **4/4**; `manage.py check` **0 issues**.

**Production data:** Existing users, hairstyles, scans **unaffected** — only `content_seo` tables. Articles remain **`status=draft`**; public list stays **`[]`** until explicit publish.

**Execution time:** Expected **seconds** on PostgreSQL (small data migrations).

**Publish policy:** **`CONTENT_DRAFT_PREVIEW` must stay off** in production; **no** `published_at` updates in this release.

---

## 9. Phase 7 — staging / integration QA (2026-11-28, local)

| Suite | Result | Notes |
| --- | --- | --- |
| `npm run build:user` @ `b6f3b9e5` | **PASS** | `version.json` → `buildId: b6f3b9e` |
| Vitest `apps/user` | **94 passed**, 3 skipped | |
| Django `content_seo` tests | **4 passed** | |
| Django `check` (post-migrate SQLite) | **0 issues** | |
| Playwright `hair-advisor-scanner.spec.ts` | **6/6** | API `:8001`, real JWT |
| Playwright `seo.spec.ts` | **3/3** | |
| Playwright `v3-polish-verification.spec.ts` | **9 passed**, **1 skipped** | Skipped: draft article desktop width (no published draft on API) |
| `tsc --noEmit` | **91 errors** | Matches [`docs/mysaloon-v3-qa/typescript-baseline.txt`](mysaloon-v3-qa/typescript-baseline.txt) — **0 new** |

**Not re-run this pass:** Full Nitro Lighthouse matrix (see prior reports); production Nitro on VPS post-deploy.

### Seven product experiences (automation vs manual)

| # | Experience | Automated | Manual / device |
| --- | --- | --- | --- |
| 1 | Guides | Playwright RU/EN; Vitest sitemap | Visual on prod after deploy |
| 2 | Article detail | Fixture article in isolated QA; **public draft N/A** | Publish is **out of scope** |
| 3 | Explore | Playwright 836px | Prod `/en/explore` after deploy |
| 4 | Hairstyle detail | Playwright 390px CTA | Spot-check slug |
| 5 | Morf AI | Playwright gallery icon | Try-on **no paid AI** in audit |
| 6 | Smart Scanner | Playwright 6 tests; permission denied simulated | **Camera + barcode hardware** |
| 7 | Hair Advisor | Scanner + history E2E | End-to-end scan on device |

---

## 10. Phase 8 — post-deploy SEO verification plan (read-only curls)

Run **after** authorized deploy; record HTML + status codes.

| Check | Expectation @ V3 |
| --- | --- |
| `/`, `/guides`, `/explore` | 200; canonical; uz hreflang set |
| `/en/explore`, `/ru/guides` | **200** (404 on prod today) |
| `/explore/men-textured-crop` | Title via `exploreDocumentTitle`; structured data |
| `/morf-ai/ingredient-scanner` | 4 hreflang + canonical |
| `robots.txt`, sitemap index | 200 |
| `sitemap-blog.xml` | **Empty** until articles published |
| Draft slugs | **404** public API; `noindex` on preview if enabled locally only |
| Wallet / private routes | `noindex` where already configured |

No claim of Google indexing without Search Console evidence.

---

## 11. Phase 9 — physical device QA

| Test | Status | Blocker class |
| --- | --- | --- |
| Android live barcode scan | **NOT PERFORMED** | **BLOCKING** for “fully verified scanner” sign-off |
| iOS live barcode scan | **NOT PERFORMED** | **BLOCKING** (same) |
| Camera permission grant + continuous scan | **NOT PERFORMED** | **BLOCKING** |
| Gallery pick → decode → product (device) | **NOT PERFORMED** | **BLOCKING** |
| Expo on `:8000` during backend deploy | **OWNER DECISION** | Coordinate pause before backend pull on dev machine |

**Release stance:** Ship **web scanner** with **Playwright + simulated** coverage; label **device QA pending** in release notes. **Do not** feature-gate Scanner V2 off production — it is already on API; **frontend alignment is the fix**.

---

## 12. Phase 10 — production deployment sequence (prepared, not executed)

### Prerequisites

1. **Owner approval** (this document).  
2. **Merge `feat/mysaloon-v3-ecosystem` → `main`** at `b6f3b9e5` **OR** explicit approval for branch checkout on VPS.  
3. Backups complete (§6).  
4. Expo / `:8000` coordination if backend tree on dev laptop must pull.

### Order (minimize downtime)

| Step | Action | Downtime |
| --- | --- | --- |
| A | **Backend** — `/var/www/mysaloon/source`: `git fetch`, checkout **`b6f3b9e5`** (or `pull main` after merge), `migrate --noinput`, restart `mysaloon.service`, verify `/health/` | **~30–90 s** API |
| B | **Frontend** — `/opt/mysaloon/Mybarber`: same SHA, `sudo bash deploy/vps/deploy-frontends.sh user` | **~2–5 min** build + **~3 s** restart |
| C | Update **both** trees to same SHA; write `deployed-sha` | — |

**Why backend before frontend:** Migrations add serializer fields; old FE tolerates extra API fields. **Opposite order** risks new FE calling fields missing if migrate skipped — **never skip migrate**.

### Exact commands (from existing scripts)

**Backend (on VPS):**

```bash
cd /var/www/mysaloon/source
git fetch origin
# After merge: git pull --ff-only origin main
# OR approved: git checkout b6f3b9e5
sudo bash deploy/vps/deploy-backend.sh   # only if on main; else manual migrate + restart
```

If not on `main`, manual equivalent:

```bash
cd /var/www/mysaloon/source/backend
sudo -u mysaloon /var/www/mysaloon/venv/bin/python manage.py migrate --noinput
sudo systemctl restart mysaloon.service
```

**Frontend (on VPS):**

```bash
cd /opt/mysaloon/Mybarber
git fetch origin
git checkout b6f3b9e5   # or pull main after merge
sudo bash deploy/vps/deploy-frontends.sh user
```

Requires `deploy/vps/build.env` for maps/OAuth keys (already on server; **not** in git).

### Expected downtime

- **User site:** brief nginx proxy errors during `mysaloon-user` restart (**&lt;10 s** typical).  
- **API:** brief **502** during `mysaloon.service` restart.  
- **Total planned maintenance:** **~5–15 minutes** including `npm ci` if lockfile changed.

---

## 13. Phase 11 — post-deployment verification checklist

- [ ] `version.json` → `buildId` matches new build  
- [ ] Frontend + backend `git rev-parse` = **`b6f3b9e5`**  
- [ ] `/health/` 200  
- [ ] Login / session refresh  
- [ ] `GET /api/v1/hairstyles/` count **62**  
- [ ] `/explore`, `/en/explore`, `/guides` 200  
- [ ] Scanner route loads Smart Scanner chrome (signed-in)  
- [ ] History API 200 with Bearer  
- [ ] Morf AI routes 200  
- [ ] `journalctl -u mysaloon-user -n 50` — no crash loop  
- [ ] Optional: Lighthouse sample on prod CDN (lab ≠ field)

---

## 14. Release blockers

| ID | Item | Classification |
| --- | --- | --- |
| B1 | Production deploy **not authorized** in this pass | **BLOCKING** (process) |
| B2 | `feat/mysaloon-v3-ecosystem` **not on `main`** — backend script pulls `main` only | **OWNER DECISION REQUIRED** — merge vs manual SHA |
| B3 | Physical camera / barcode device QA | **BLOCKING** for full scanner sign-off; **NON-BLOCKING** for urgent FE/API alignment if owner accepts risk |
| B4 | Mobile lab Lighthouse Performance &lt; 90, LCP &gt; 2.5s | **NON-BLOCKING** (documented; desktop home CLS **fixed**) |
| B5 | 91 pre-existing TypeScript errors | **NON-BLOCKING** (build passes; baseline unchanged) |
| B6 | Phase 1 article **publish** | **OWNER DECISION REQUIRED** — **excluded** from this release |
| B7 | Expo / port **8000** backend sync on dev machine | **OWNER DECISION REQUIRED** before pulling V3 on local API used by mobile |
| B8 | Frontend/backend mismatch **today** | **BLOCKING** for current prod quality — **RESOLVED by deploying `b6f3b9e5`** |

---

## 15. Performance expectations (honest)

From V3 lab (Nitro local, not prod CDN):

- Desktop home CLS **≤ 0.1** after `b6f3b9e5` (**met** in lab).  
- Mobile LCP on explore **~6.7–11.5 s** lab — **target 2.5 s not met**; primary gate is shared JS boot (`ssr: false`).  
- Ingredient scanner landing mobile LCP **~3.7 s** lab (better).  
- **Do not** market “90+ mobile Performance” without prod CDN measurements post-deploy.

---

## 16. References

- [`docs/MYSALOON_FULL_DEPLOYMENT_STATUS_REPORT.md`](MYSALOON_FULL_DEPLOYMENT_STATUS_REPORT.md)  
- [`docs/MYSALOON_V3_RELEASE_READINESS_REPORT.md`](MYSALOON_V3_RELEASE_READINESS_REPORT.md)  
- [`docs/MYSALOON_V3_PRODUCTION_PERFORMANCE_REPORT.md`](MYSALOON_V3_PRODUCTION_PERFORMANCE_REPORT.md)  
- [`docs/MYSALOON_V3_DEEP_PERFORMANCE_REPORT.md`](MYSALOON_V3_DEEP_PERFORMANCE_REPORT.md)  
- [`docs/SEO_PHASE1_CONTENT_REPORT.md`](SEO_PHASE1_CONTENT_REPORT.md)  
- Deploy: [`deploy/vps/deploy-frontends.sh`](../deploy/vps/deploy-frontends.sh), [`deploy/vps/deploy-backend.sh`](../deploy/vps/deploy-backend.sh)

---

## Authorization boundary

**Prepared:** unified RC, backups plan, migration test, automated QA re-run, deployment commands.  
**Awaiting:** explicit owner approval to merge, migrate production DB, and run VPS deploy scripts.

**Do not proceed** until you approve **merge-to-main + deploy**, **branch SHA deploy**, or **interim `f0573e39` frontend-only** hotfix.