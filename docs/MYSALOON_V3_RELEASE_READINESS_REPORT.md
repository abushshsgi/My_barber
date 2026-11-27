# MySaloon V3 — release readiness report

Date: 2026-11-27  
Branch: `feat/mysaloon-v3-ecosystem`  
Parent SEO branch: `feat/seo-phase1-content` @ `1daecf14`  
Merge-base with `main`: `f0573e39`  
Scanner V2 RC: `feat/scanner-v2-release-candidate` (not merged)

**Scope:** Verification and evidence only. No production deploy, no `main` merge, no article publish, port **8000** Django left running.

---

## Executive summary

| Category | Result |
| --- | --- |
| Targeted UI polish (prior pass) | 9/10 visual checks captured via Playwright; scan history empty **after** shot blocked on mock auth |
| Localization | **FIXED AND VERIFIED** for `HairAdvisor2ProductHeader` (this pass) |
| Runtime article serializer | **FIXED AND VERIFIED** on isolated SQLite (`qa_verify_8001.sqlite3`), port **8001** |
| SEO automated | Vitest + Playwright `seo.spec.ts` passed; hreflang dedupe unit-verified |
| Lighthouse | **Lab only** on Vite dev `/explore` (not production build) |
| Physical camera / signed-in scanner | **BLOCKED** (simulated permission only) |

---

## Final Git commit

After this verification pass, see `git log -1 --oneline` on `feat/mysaloon-v3-ecosystem` (includes localization completion, Playwright verification spec, polish index, this report).

Prior polish commit: `f057d1e9`.

---

## Evidence: before / after

Index: [`docs/mysaloon-v3-qa/screenshots/polish/INDEX.md`](mysaloon-v3-qa/screenshots/polish/INDEX.md)

| Asset | Status |
| --- | --- |
| after-scanner-permission-denied.png | Captured (simulated) |
| after-history-empty.png | **Not captured** — see § Scan history |
| after-advisor-mobile/desktop.png | Captured |
| after-morf-gallery.png | Captured |
| after-guides-ru/en.png | Captured |
| after-explore-836.png | Captured |
| after-detail-390.png | Captured |
| after-article-desktop.png | Captured (draft preview route when API allows) |

---

## Issue status matrix

| # | Issue | Status | Evidence |
| --- | --- | --- | --- |
| Scanner permission consistency | **FIXED AND VERIFIED** (simulated) | Playwright: no “Avtomatik skanerlash faol” when camera not granted; screenshot |
| Scan history empty | **FIXED BUT UNVERIFIED** | UI implemented; Playwright blocked by mock JWT vs API session |
| Advisor result layout / demo | **FIXED AND VERIFIED** | Playwright demo route + screenshots |
| Advisor badges i18n | **FIXED AND VERIFIED** | `HairAdvisor2ProductHeader` + locale keys |
| Morf gallery icon | **FIXED AND VERIFIED** | Playwright screenshot |
| Maintenance banner | **PARTIALLY FIXED** | Token styling; RU/EN copy in JSON — not re-shot per locale |
| Explore 836px dock | **FIXED AND VERIFIED** | Playwright 836px, no horizontal overflow |
| Model count | **FIXED AND VERIFIED** | Dynamic `{{count}}` = 3 personas |
| Try-on CTA truncation | **FIXED AND VERIFIED** | Playwright text assertion, screenshot |
| Article 70ch body | **FIXED AND VERIFIED** | Playwright bounding box + screenshot |
| Duplicate hreflang | **FIXED AND VERIFIED** | Vitest uniqueness; manual DOM on draft still recommended before publish |
| Sitemap env isolation | **FIXED AND VERIFIED** | `base-url.test.ts`; local `sitemap-blog.xml` empty (110 B), no prod URLs |
| List serializer runtime | **FIXED AND VERIFIED** | Isolated DB HTTP measurement (below); **not** re-run on port 8000 |
| Hairstyle save on detail | **NOT FIXED** | Documented in polish report |
| Lighthouse production | **PARTIALLY FIXED** | Dev lab run only |
| Physical device QA | **BLOCKED** | Not in scope of automation |

---

## §02 — Isolated QA environment

| Resource | Configuration |
| --- | --- |
| Port 8000 | **Untouched** — existing SQLite session for Expo |
| Port 8001 | New Django with `DATABASE_URL=sqlite:///.../qa_verify_8001.sqlite3`, latest code, migrations applied |
| Port 3000 | Existing Vite user app (`PLAYWRIGHT_SKIP_WEB_SERVER=1`) |
| Production API | Not used for serializer proof |
| Frontend prod build | **Not run** for Lighthouse (dev URL used) |

**Teardown:** Delete `backend/qa_verify_8001.sqlite3` after owner review if desired; stop process on 8001 when idle.

---

## §04 — Scanner (simulated)

Playwright opens `/ai-style/care/ingredient` with **no camera permission** and mock localStorage tokens.

Observed (automated):

- “Avtomatik skanerlash faol” / “Automatic scanning active” count **0**.
- Screenshot: `after-scanner-permission-denied.png`.

**Not verified:** real `getUserMedia` on hardware; Expo session on :8000.

---

## §05 — Scan history

Implementation includes loading, empty, error, unauthorized states and CTA `scanner.historyEmptyCta`.

**Automation blocker:** Mock JWT in `e2e/hair-advisor-scanner.spec.ts` does not satisfy backend session validation; scanner chrome (History button) not reachable in Playwright with `seedAuth` alone.

**Manual verification required:** Local Scanner account → open History → confirm empty copy (no em dash).

---

## §06 — Hair Advisor

- Demo route: demo notice visible (UZ/RU/EN keys).
- Actions: **Continue with Morf AI**, **Scan another**, **Open scan history** (`?history=1` on scan path), **Compare** (hidden on demo).
- Placeholder SVG for missing product image unchanged.
- Result actions in document flow (no fixed overlap bar).

Screenshots: mobile + desktop demo results.

---

## §07 — Localization

Completed this pass:

- `HairAdvisor2ProductHeader`: `badgeVerified`, `metaCountry`, `metaVolume`, `metaBarcode`, etc.
- Locales: `uz.json`, `en.json`, `ru.json`.

Prior pass: scanner, explore, advisor result strings.

---

## §13 — SEO metadata

| Check | Result |
| --- | --- |
| `seo.spec.ts` | 3/3 passed (robots, sitemap index, morf canonical shell) |
| Hreflang duplicates | Vitest: unique alternates per published locale set |
| Draft public list | Django tests: `[]` for RU draft when EN published |
| Temporary publish fixtures for hreflang HTML | **Not inserted** (avoid DB drift); recommend owner preview publish on staging |

---

## §14 — Article serializer (runtime, isolated)

Measured via Django test client on **`qa_verify_8001.sqlite3`** after temporary published row `qa-serializer-check`:

| Response | Bytes | `content` field |
| --- | ---: | --- |
| List card (`GET /api/v1/content/articles/?locale=uz`) | **263** | **Absent** |
| Detail (`GET .../qa-serializer-check/?locale=uz`) | **3018** | Present (~400 words) |

Fixture **deleted** after measurement.

**Port 8000:** Not restarted; runtime list payload on the live process may still differ until reload.

---

## §15 — Sitemap

`GET http://127.0.0.1:3000/sitemap-blog.xml` → **110 bytes**, empty `urlset` (no published articles). Proxied via Vite to local API (default `DEV_API_TARGET` :8000).

No production article URLs observed in this response.

---

## §16 — Lighthouse (laboratory)

Target: `http://127.0.0.1:3000/explore` (Vite **dev**, mobile throttling). Raw JSON: `docs/_lighthouse-explore-dev.json`.

| Category | Score (0–100) |
| --- | ---: |
| Performance | 30 |
| Accessibility | 100 |
| SEO | 100 |

| Metric | Value |
| --- | --- |
| LCP | 79.5 s (lab) |
| CLS | 0.028 |
| TBT | 1310 ms |

These numbers reflect **unoptimized dev server**, not a production build or field CWV. A follow-up Lighthouse run on `npm run build && vite preview` is recommended before release.

---

## §17 — Automated regression

| Suite | Result |
| --- | --- |
| Vitest (`apps/user`) | **94 passed**, 3 skipped |
| Django `content_seo` | **4 passed** |
| Playwright `e2e/seo.spec.ts` | **3 passed** |
| Playwright `e2e/v3-polish-verification.spec.ts` | **8 passed**, 1 failed (history auth) |
| Playwright `e2e/hair-advisor-scanner.spec.ts` | **1 passed**, 2 failed (auth) |
| ESLint (spot check) | **66 prettier issues** on pre-existing files (not introduced in this pass) |
| TypeScript `tsc` | **Not run** (no script in package.json beyond vite) |
| Production `npm run build` | **Not run** this session |

---

## §19 — Branch integration (read-only)

```
main @ f0573e39
  └── feat/scanner-v2-release-candidate (diverged; Universal Smart Scanner V2 packaging)
  └── feat/seo-phase1-content @ 1daecf14
        └── feat/mysaloon-v3-ecosystem (+5 commits ahead of SEO branch)
```

| Branch pair | Notes |
| --- | --- |
| `main` ← `feat/mysaloon-v3-ecosystem` | ~111 files, guides + explore width + scanner UI + SEO content models; expect conflicts in `apps/user` routes and `content_seo` if `main` moved |
| `feat/seo-phase1-content` ← V3 | V3 is direct descendant; merge is fast-forward/review only |
| Scanner V2 RC | Parallel scanner work; **do not merge** without explicit owner plan; overlap in `packages/scanner` and Hair Advisor routes |

**Proposed integration order (owner approval):**

1. Review & approve V3 QA evidence.  
2. Merge `feat/seo-phase1-content` → `main` **only after** article publish decision.  
3. Merge `feat/mysaloon-v3-ecosystem` → `main` (or merge V3 into SEO then single PR).  
4. Keep `feat/scanner-v2-release-candidate` separate until V2 sign-off.  
5. Deploy backend with `content_seo` migrations before user app that expects card serializer.  
6. Reload port 8000 / production API workers after backend deploy.

**Rollback:** Revert deploy commits; content_seo migrations are additive; republish articles from `phase1_articles.py` if needed.

---

## Deployment prerequisites

- [ ] Owner approves screenshots + this report  
- [ ] Signed-in scanner + history empty verified manually  
- [ ] Restart/reload backend on staging to pick up `SeoArticleCardSerializer`  
- [ ] Lighthouse on production build artifact  
- [ ] Phase 1 article publish decision  
- [ ] No Scanner V2 merge unless approved  

---

## Physical-device QA

**BLOCKED** in automation. Expo scanner on `192.168.x.x:8000` unchanged.

---

## Remaining defects

1. Playwright cannot drive authenticated scanner without real login or API mock layer.  
2. Live Django on **8000** may still return `content` on list until process reload.  
3. Maintenance banner not locale-screenshot per language.  
4. Performance lab scores on dev server are poor; not release representative.  
5. Hairstyle save on explore detail still absent.  

---

**Stop here.** Await owner release approval before merge, publish, or production deploy.