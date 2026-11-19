# MySaloon — VPS PostgreSQL 16 Staging Validation

**Date:** 2026-11-19  
**Operator:** Cursor agent via `ssh root@mysaloon.uz` (BatchMode, existing key)  
**Production safety:** `mysaloon.service` **not** restarted/stopped; **no** migrate/test against `mysaloon_db`; **no** `git pull` under `/var/www/mysaloon/source`; **no** production `.env` changes; **no** Redis `FLUSH*`.

---

## 1. SSH connection status

| Item | Result |
|------|--------|
| SSH | **OK** (`root@mysaloon.uz`, BatchMode) |
| Alternative user | `mysaloon@mysaloon.uz` also accepts key |

---

## 2. Infrastructure audit (read-only)

| Check | Result |
|-------|--------|
| OS | Ubuntu **24.04.5 LTS** (kernel 6.8.0-147-generic) |
| PostgreSQL | **16.15** (Ubuntu package) |
| `postgresql` | **active** |
| `redis-server` | **active** |
| `mysaloon.service` | **active** (unchanged) |
| RAM | ~3.8 GiB total, ~2.6 GiB available (snapshot) |
| Disk `/` | ~59 G, **43 G free** (~25% used) |
| PostgreSQL databases (names) | `mysaloon_db`, `mysaloon_staging_db`, `postgres` |
| Login roles (names) | `mysaloon_app`, `postgres` (+ new isolated role below) |
| Production repo | `/var/www/mysaloon/source` — git **`205b1fd6`** |
| Frontends (prod) | `/opt/mysaloon/Mybarber` — git **`205b1fd6`** |
| Local workspace HEAD | **`205b1fd6`** (+ uncommitted Hair Advisor work synced to staging tree) |

---

## 3. Production isolation verification

| Control | Evidence |
|---------|----------|
| Separate DB | `mysaloon_hair_staging` created; owner role `mysaloon_hair_staging` |
| REVOKE on prod DB | `REVOKE CONNECT ON DATABASE mysaloon_db FROM mysaloon_hair_staging` (setup script) |
| Connect test as staging role → `mysaloon_db` | **`DENIED_AS_EXPECTED`** (`run-hair-staging-smoke.sh`) |
| Tests/migrate target | `127.0.0.1` / `mysaloon_hair_staging` only (printed db name, no credentials) |
| Prod `mysaloon_db` table check | `hair_advisor_productaggregationjob` → **NULL** (migrations **not** applied to prod) |
| Prod source tree | **`PROD_NO_HAIR_ADVISOR_DIR`** at `/var/www/mysaloon/source/backend/hair_advisor` |
| Service | Remained **active** throughout |

Credentials live in `/opt/mysaloon/hair-advisor-staging/.env.hair_test` (mode **600**, not logged).

---

## 4. Staging workspace

| Path | Purpose |
|------|---------|
| `/opt/mysaloon/hair-advisor-staging/backend` | Synced from **local** workspace (`mysaloon-backend-staging.tar.gz`) |
| `/opt/mysaloon/hair-advisor-staging/.env.hair_test` | Isolated `DATABASE_URL`, `TEST_DATABASE_URL`, `REDIS_URL=redis://127.0.0.1:6379/15` |
| `/opt/mysaloon/hair-advisor-staging/media` | Test media root |

Setup scripts (in repo): `backend/deploy/vps/setup-hair-staging-db.sh`, `run-hair-staging-validation.sh`, `run-hair-staging-smoke.sh`.

---

## 5. Migration results (isolated DB only)

**Command (on VPS):** `source .env.hair_test && /var/www/mysaloon/venv/bin/python manage.py migrate --noinput`  
**CWD:** `/opt/mysaloon/hair-advisor-staging/backend`

| hair_advisor migration | Result |
|------------------------|--------|
| `0001_initial` | Applied |
| `0002_product_verification` | Applied |
| `0003_aggregation_jobs` | Applied |

`manage.py check` → **no issues**.

Full project migrate applied to empty staging DB (required for FKs); **does not affect** `mysaloon_db`.

---

## 6. PostgreSQL test results

**Command:**  
`source /opt/mysaloon/hair-advisor-staging/.env.hair_test`  
`unset MYSALOON_FORCE_SQLITE_TESTS`  
`/var/www/mysaloon/venv/bin/python manage.py test hair_advisor -v1`

**Database:** Django disposable test DB on PostgreSQL 16 (via `TEST_DATABASE_URL`).

| Metric | Value |
|--------|------:|
| Run | 29 |
| Passed | 28 |
| Skipped | 1 |
| Failed | 0 |
| Duration | ~72.5 s |

Log: `/opt/mysaloon/hair-advisor-staging/test-hair_advisor.log`

**SQLite comparison (local):** same counts (29 / 28 / 1 / 0) — Postgres run is authoritative for engine validation.

---

## 7. Aggregation worker (staging)

| Check | Result |
|-------|--------|
| Manual `run_aggregation_worker` 15 s | **OK** (clean timeout, no crash) |
| systemd production worker | **Not enabled** (per policy) |
| Unit template | `backend/deploy/mysaloon-hair-aggregation-worker.service` (unchanged on prod) |

---

## 8. Redis validation

| Check | Result |
|-------|--------|
| `redis-cli -n 15 PING` | **PONG** |
| Production db 0 | **Not flushed** |

Cache invalidation / verified barcode: covered by passing `test_product_verification` / e2e tests on Postgres.

---

## 9. Gemini live test

| Item | Result |
|------|--------|
| Staging `.env.hair_test` | **NOT_IN_STAGING_ENV** (no Gemini key copied) |
| Production `.env` | Gemini line **present** (value **not** read or logged) |
| Live HTTP call | **NOT RUN** — would require copying prod secret into staging or explicit ops authorization |

---

## 10. Web / admin E2E

| Item | Result |
|------|--------|
| Production URL `https://mysaloon.uz/.../ingredient` | Redirects to **auth** (read-only navigation) |
| Write E2E on live API | **NOT RUN** (policy) |
| Staging frontend pointing at isolated API | **Not deployed** |
| Local production builds (prior session) | user + admin **OK** |

---

## 11. Mobile validation

| Item | Result |
|------|--------|
| Device / emulator QA | **NOT RUN** |
| Static integration | Code paths present; prior local builds not re-run on VPS |

---

## 12. Regression (broader monorepo)

| Suite | Result |
|-------|--------|
| `hair_advisor` on Postgres | **OK** (above) |
| Try-On, payments, chat, subscriptions | **NOT RUN** on VPS (scope/time; prod DB untouched) |

---

## 13. Security notes

- Staging role denied prod DB connect (verified).
- Admin permission denial test included in suite (`test_permissions`).
- No credentials or API keys in this document.
- Production service and production database **unchanged**.

---

## 14. Remaining blockers

1. Deploy Hair Advisor **code** to prod/staging frontends + backend (prod still at `205b1fd6` without `hair_advisor` tree).
2. Live Gemini smoke in **isolated** env with dedicated test key in `.env.hair_test` only.
3. Browser E2E against a **staging** stack (not auth-gated production).
4. Mobile device QA.
5. Optional: run subset of non–`hair_advisor` tests on `mysaloon_hair_staging` (long-running).

---

## 15. Production readiness

| Level | Assessment |
|-------|------------|
| **Hair Advisor on PostgreSQL 16** | **Validated** in isolated `mysaloon_hair_staging` |
| **Production release** | **NOT READY** — prod DB unmigrated, prod codebase missing `hair_advisor`, no authorized deploy |
| **Staging ops** | Ready to enable worker **on staging host only** with ops approval |