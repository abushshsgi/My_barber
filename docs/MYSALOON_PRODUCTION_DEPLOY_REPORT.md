# MySaloon Hair Advisor 2.0 — Production Deploy Report

**Date:** 2026-11-19  
**Final status:** **DEPLOYED WITH NONCRITICAL LIMITATIONS**

---

## 1. Features completed (production)

Hair Advisor backend app deployed to `/var/www/mysaloon/source/backend/hair_advisor` with migrations on `mysaloon_db`, API routes live, aggregation worker enabled, user/admin frontends rebuilt with Hair Advisor pages.

---

## 2. Release gates

| Gate | Result |
|------|--------|
| PG staging tests (29) | 28 passed, 1 skipped |
| PG staging e2e module | 5 run, 4 passed, 1 skipped |
| User/admin builds | OK (local + VPS) |
| `manage.py check` (prod) | OK |
| `mysaloon_db` backup | `/var/backups/mysaloon/mysaloon_db_20261119T030804Z.dump` |
| Source snapshot | `/var/backups/mysaloon/source_20261119T030804Z.tar.gz` |
| Migrations additive | `hair_advisor` 0001–0003 only |
| Mobile physical device QA | **Not run** |
| Live Gemini smoke | **Not run** (mock tests only) |
| Staging HTTP runserver | Failed bind; backend e2e still passed |

---

## 3. Production actions (executed)

1. `pg_dump -Fc` of `mysaloon_db`
2. Source tree backup tarball
3. Release overlay via `/tmp/mysaloon-release.tar.gz` (local workspace)
4. `migrate` on `mysaloon_db` — hair_advisor tables created
5. `deploy-frontends.sh all` (after `safe.directory` fix)
6. **Incident:** `start.sh` CRLF → API 502; fixed with `sed` strip `\r`, service recovered
7. `systemctl restart mysaloon.service` — **active**, `health=200`
8. `mysaloon-hair-aggregation-worker.service` — **active**

**Not used:** production `git pull` (Hair Advisor was not on `origin/main`).

---

## 4. Post-deploy smoke

| Check | Result |
|-------|--------|
| `https://api.mysaloon.uz/health/` | **200** |
| `https://mysaloon.uz/` | **200** |
| `https://admin.mysaloon.uz/` | **200** |
| `/ai-style/care/ingredient` | **200** (static; auth may redirect) |
| `POST /api/v1/hair-advisor/scans/` (no auth) | **401** (expected) |
| `hair_advisor_productaggregationjob` on `mysaloon_db` | present |

---

## 5. Rollback

1. Restore DB: `pg_restore -d mysaloon_db /var/backups/mysaloon/mysaloon_db_20261119T030804Z.dump` (use `--clean` only with ops approval; do not drop customer data casually)
2. Restore source: extract `source_20261119T030804Z.tar.gz` to `/var/www/mysaloon/`
3. `systemctl restart mysaloon.service`
4. `systemctl disable --now mysaloon-hair-aggregation-worker.service`

Hair Advisor migrations are additive; rollback without DB restore leaves empty tables (acceptable if feature disabled in code).

---

## 6. Remaining blockers / limitations

- **Mobile device** barcode/camera QA not executed — mandatory scanner path not hardware-verified
- **Live Gemini** — no controlled live call in this deploy
- **Authenticated E2E** on production API not run (no test credentials logged here)
- **Monorepo regression** suite not fully run on VPS
- Deploy script must always **strip CRLF** on `bin/*.sh` when syncing from Windows

---

## 7. Scripts added

- `backend/deploy/vps/apply-release-to-production.sh`
- `backend/deploy/vps/production-smoke-hair.sh`
- `backend/deploy/vps/staging-api-e2e.sh`

---

## 8. Production readiness

| Area | Status |
|------|--------|
| API + DB schema | **Live** |
| Worker | **Live** |
| Frontends | **Deployed** |
| Full product sign-off | **Pending** device + live Gemini + auth E2E |