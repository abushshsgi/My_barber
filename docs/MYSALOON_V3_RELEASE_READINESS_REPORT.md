# MySaloon V3 — release readiness report

Date: 2026-11-27 (release-blocker pass)  
Branch: `feat/mysaloon-v3-ecosystem`  
Parent SEO branch: `feat/seo-phase1-content` @ `1daecf14`  
Merge-base with `main`: `f0573e39`  
Scanner V2 RC: `feat/scanner-v2-release-candidate` (not merged)

**Scope:** Verification and evidence only. No production deploy, no `main` merge, no article publish, port **8000** Django left running for Expo.

---

## Executive summary

| Category | Result |
| --- | --- |
| Production build + Nitro SSR | **RUN** — `npm run build`, `node dist/server/index.mjs` on **:3002**, `API_UPSTREAM_URL=http://127.0.0.1:8001` |
| Lighthouse (lab) | **MEASURED** — mobile/desktop medians; **targets not met** on key mobile routes (see §16) |
| Dev LCP 79.5s | **EXPLAINED** — Vite dev `/explore`; prod Nitro explore mobile LCP **~6.7s** median |
| Scanner Playwright auth | **FIXED AND VERIFIED** — isolated user on `qa_verify_8001.sqlite3`, real JWT via `playwright_auth_json` + password-login on :8001 |
| Scan history empty screenshot | **CAPTURED** — `after-history-empty.png` (10/10 index) |
| Hreflang (fixture) | **VERIFIED** — server HTML + hydrated DOM, one alternate per `uz`/`ru`/`en`/`x-default`; fixtures **removed** after check |
| Article serializer (:8001) | **VERIFIED (prior pass)** — list 263 B, detail 3018 B — not re-run |
| Physical camera / signed-in scanner | **BLOCKED** (hardware) |

---

## Final Git commit

After this pass: see `git log -1 --oneline` on `feat/mysaloon-v3-ecosystem`.

---

## Evidence: polish screenshots

Index: [`docs/mysaloon-v3-qa/screenshots/polish/INDEX.md`](mysaloon-v3-qa/screenshots/polish/INDEX.md) — **10/10** after `after-history-empty.png`.

---

## §02 — Isolated QA environment

| Resource | Configuration |
| --- | --- |
| Port **8000** | **Untouched** — Expo / live SQLite |
| Port **8001** | `DATABASE_URL=sqlite:///qa_verify_8001.sqlite3`, `MYSALOON_QA_ISOLATED=1` (LocMem cache, no Railway Redis) |
| Port **3000** | Vite dev during Playwright; `DEV_API_TARGET=http://127.0.0.1:8001` |
| Port **3002** | Production Nitro SSR for Lighthouse + hreflang HTML checks |
| Temporary SEO rows | `qa-lighthouse-article` (uz/ru/en) — **deleted** via `seed_playwright_isolated --teardown` |

**Playwright auth:** phone `+998900000199` / `PlaywrightIsolated1!`, Care+ subscription + hair profile seeded; tokens via `manage.py playwright_auth_json` or `POST …/password-login/` on :8001.

---

## §05 — Scan history authentication

| Check | Result |
| --- | --- |
| `POST /api/v1/auth/phone/password-login/` on :8001 | **200** (with `MYSALOON_QA_ISOLATED=1`) |
| `GET /api/v1/hair-advisor/history/` with Bearer | **200**, `[]` |
| Playwright: scanner chrome + History button | **6/6 passed** in `hair-advisor-scanner.spec.ts` |
| Playwright: empty state UI + screenshot | **passed** in `v3-polish-verification.spec.ts` |
| Advisor demo → scan URL with `history` search | **passed** (href assertion) |
| `?history=1` auto-open | **FIXED** — `HairAdvisor2ScanPage` strips stray quotes from search param |

Mock JWT removed for scanner auth tests; API mocks **not** used for history (real session on :8001).

---

## §13 — SEO metadata (fixture pass)

Artifact: [`docs/mysaloon-v3-qa/seo/hreflang-fixture-report.json`](mysaloon-v3-qa/seo/hreflang-fixture-report.json)

While fixture was published (before teardown):

- Initial server HTML: canonical `https://mysaloon.uz/guides/qa-lighthouse-article`, **4** hreflang links (`uz`, `ru`, `en`, `x-default`), exactly one each.
- Hydrated DOM: same four, **no duplicates**.
- Draft virtual-soch article: not published; preview remains protected via existing app rules.

`sitemap-blog.xml` on :3002 listed fixture URLs only while seeded; empty after teardown.

---

## §14 — Article serializer (runtime, isolated)

Prior measurement on **`qa_verify_8001.sqlite3`** (unchanged this pass):

| Response | Bytes | `content` field |
| --- | ---: | --- |
| List (`GET /api/v1/content/articles/?locale=uz`) | **263** | Absent |
| Detail (`…/qa-serializer-check/?locale=uz`) | **3018** | Present |

---

## §15 — Port 8000 reload procedure (owner approval only)

**Do not execute while the Expo scanner session on :8000 is active.**

1. Confirm with owner / mobile QA that the live `:8000` session can pause.
2. On the host running Django **8000** (not :8001): deploy or pull `feat/mysaloon-v3-ecosystem` backend code **without** merging to `main`.
3. `python manage.py migrate` against the live DB.
4. Gracefully restart the **8000** process (runserver, Daphne, or gunicorn — same as today).
5. Smoke checks:
   - `GET /api/v1/content/articles/?locale=uz` — list cards **without** `content` body field.
   - `GET /api/v1/content/articles/<published-slug>/?locale=uz` — detail **with** full `content`.
6. Resume Expo / mobile QA against the same `host:8000`.

---

## §16 — Lighthouse (production Nitro, laboratory)

Environment: Windows lab, `http://127.0.0.1:3002`, 2 runs/route, median.  
Manifest: [`docs/mysaloon-v3-qa/lighthouse/manifest-prod-first-pass.json`](mysaloon-v3-qa/lighthouse/manifest-prod-first-pass.json)  
Raw per-route: `docs/mysaloon-v3-qa/lighthouse/*-median.json`

### Before (dev server — not representative)

| Target | Perf | LCP | CLS |
| --- | ---: | ---: | ---: |
| `/explore` Vite **dev** :3000 | 30 | **79.5 s** | 0.028 |

Source: `docs/_lighthouse-explore-dev.json` — unminified HMR, no SSR production pipeline.

### After (production build + Nitro SSR)

| Route | Form factor | Perf | LCP (ms) | CLS | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| Home `/` | mobile | 48.5 | 12274 | 0 | 100 |
| Home `/` | desktop | 56 | 2767 | **1.10** | 100 |
| Guides | mobile | 48.5 | 9738 | 0.034 | 100 |
| Article (qa fixture) | mobile | 52 | 9941 | 0.034 | 100 |
| Explore | mobile | 57 | 6716 | 0.068 | 100 |
| Explore | desktop | 78.5 | 2991 | 0.043 | 100 |
| Hairstyle detail | mobile | 56 | 13135 | 0.068 | 100 |

Post-pass sample (lazy MediaPipe split, home mobile, 1 run): perf **56**, LCP **~11800 ms**, CLS **0.068** — `home-mobile-after-build2-run1.json`.

**Target gate (owner):** Performance **90+**, LCP **≤ 2.5s**, CLS **≤ 0.1** — **not met** on mobile home/guides/article/detail in this lab. Bottlenecks evidenced: large JS/CSS initial payloads (`index-*.js` ~444 KB, `styles-*.css` ~290 KB), GA tag download, main-thread JS; desktop home CLS spike from layout shift on root shell hydrate.

**Change applied (demonstrated):** dynamic `import()` for `@mediapipe/tasks-vision` in `useFaceLandmarker.ts` so face ML is not a static dep of unrelated routes.

---

## §17 — Automated regression

| Suite | Result |
| --- | --- |
| Vitest (`apps/user`) | **94 passed**, 3 skipped |
| Django `content_seo` | **4 passed** |
| Playwright `e2e/seo.spec.ts` | **3 passed** |
| Playwright `e2e/hair-advisor-scanner.spec.ts` | **6 passed** |
| Playwright `e2e/v3-polish-verification.spec.ts` | **9 passed**, **1 skipped** (draft article on upstream when fixture absent) |
| Production `npm run build` | **passed** |

---

## Physical-device QA

**BLOCKED** in automation (real `getUserMedia`, barcode hardware, signed-in Expo on :8000).

---

## Remaining owner decisions

1. Accept mobile lab performance below 90 or schedule a dedicated perf sprint (CDN, route-level JS budgets, desktop CLS).
2. Approve port **8000** backend reload when Expo session allows (§15).
3. Phase 1 article publish / merge-to-main decision unchanged.
4. Manual device scanner smoke on hardware.

**Stop here.** Await owner release approval before merge, publish, or production deploy.