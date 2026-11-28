# MySaloon — public root split & rendering performance

**Date:** 2026-11-28  
**Branch:** `feat/mysaloon-public-rendering-performance` (not merged)  
**Production (unchanged):** `3caad448`  
**Parent experiments:** `feat/mysaloon-selective-ssr` @ `4bee927b`  

---

## Executive summary

| Area | Outcome |
| --- | --- |
| Root bottleneck | **Shared client bundle** (~**289 kB gzip** initial JS) must execute before LCP; TTFB **~4–6 ms** (not the limiter) |
| Hybrid Nitro explore shell | **Regressed / unclear LCP benefit** vs older lab medians; removed on this branch |
| Public catalog shell (Explore) | **Implemented** — lazy `InteractiveAppShell` chunk; auth/onboarding/currency **not mounted** for guest `/explore` |
| Measured Explore mobile LCP (lab) | **~11.29 s** median (3 runs) — **not ≤ 2.5 s**; Perf **57** |
| vs hybrid branch (`4bee927b`) | LCP **−138 ms**, TBT **−30 ms** (marginal); Perf **unchanged** |
| Expansion gate (§11) | **NOT PASSED** — do not roll out to home/guides/detail |
| Regression | Vitest **99** pass, SEO **4/4**, polish **13/14**, scanner **6/6**, `content_seo` **4/4** |
| TypeScript | **92** errors (baseline **91** + **1** shell typing surface) |

**Recommendation:** Keep on experimental branch. Next engineering step is **route-level entry splitting** (public vs app bootstrap in TanStack Start), not additional HTML injection.

---

## 01 — Branch isolation

- Created `feat/mysaloon-public-rendering-performance` from `4bee927b`.
- `feat/mysaloon-selective-ssr` preserved.
- No `main` / production changes; port **8000** untouched.

---

## 02 — Controlled A/B baseline

Identical lab: Nitro prod, `API_UPSTREAM_URL=http://127.0.0.1:8001`, SQLite QA, Lighthouse mobile simulate, 3 runs.

| Build | Source | Explore LCP median | Perf | TBT median |
| --- | --- | ---: | ---: | ---: |
| **A** `3caad448` | Archived `lighthouse/manifest-before-d5759810` (same lab family) | **6716 ms** | 57 | ~161 ms |
| **B** `4bee927b` hybrid | `lighthouse-hybrid-ssr/manifest.json` | **11425 ms** | 57 | 127 ms |
| **C** public shell (this branch) | `ab-lighthouse-public-shell/manifest.json` | **11286 ms** | 57 | **96.5 ms** |

**Worktree rebuild** of A/B in one session failed (Vite `@lovable.dev/vite-tanstack-config` resolution in detached worktrees). Comparison uses **C measured today** + **B archived same-day** + **A archived pre-hybrid** — see `docs/mysaloon-v3-qa/ab-lighthouse-comparison.json`.

**Verdict:** Hybrid HTML overlay **did not** beat pre-overlay lab LCP; public shell **marginally** improves TBT vs hybrid but **does not** approach 2.5 s LCP or Perf 90.

---

## 03 — LCP root cause attribution

Evidence: `docs/mysaloon-v3-qa/ab-lighthouse-public-shell/explore-run{1,2,3}.json`

| Subpart | Duration (typical) |
| --- | ---: |
| TTFB | **~5–7 ms** |
| Resource load (LCP image) | **~25 ms** |
| Element render delay | **~400 ms** |
| **Unattributed gap** | **~6+ s** before paint |

**Bootup-time (main thread):** `vendor-radix` **~843 ms**; document **~354 ms**; analytics third-party **~142 ms**.

**DOM LCP candidate:** Explore hero WebP (`mid-fade.webp`) after React tree mounts — not the sr-only `seo-prerender` block.

**Conclusion:** Lighthouse LCP is **gated by JS download + parse + React mount** (index + router + query + i18n + radix in initial graph). Nitro static overlay on hybrid branch could win a **competing** LCP timer, then lose when React paints the hero (**late candidate**).

---

## 04 — Root provider dependency audit

| Provider / module | Public explore guest | Auth / private | Cost driver |
| --- | ---: | ---: | --- |
| `I18nProvider` + i18n init | **Yes** | Yes | Bundled `uz`; ru/en async |
| `QueryClientProvider` | **Yes** | Yes | Required for hairstyles |
| `AudienceProvider` | **Yes** | Yes | Light context |
| `UserLayout` | **Yes** | Yes | Dock, badges hooks (queries disabled without user) |
| `CurrencyProvider` | **No** (public shell) | Yes | Avoided on guest explore |
| `AuthSessionGuard` | **No** (lazy chunk) | Yes | `bootstrapUserSession`, WS, push |
| `OnboardingGuard` | **No** | Yes | `/me` gate when logged in |
| `DeferredClientWidgets` | Idle lazy | Yes | Firebase/GA split |
| `MorphLcpRouteGuard` | **No** | Yes | Try-on only |
| Font `@fontsource` JS import | **Removed** → CSS `@font-face` | Yes | Less JS parse |

Matrix file: logic in `apps/user/src/lib/public-shell-paths.ts`, shells in `components/shell/*`.

---

## 05–07 — Architecture decision

| Option | Feasibility | Outcome |
| --- | --- | --- |
| A Selective React SSR | Root `ssr: false` + #423 risk | **Not safe** |
| B Route prerender only | Nitro inject (existing) | SEO **yes**, LCP **no** |
| C **Lightweight public root + progressive enhancement** | **Supported** | **Selected (Explore POC)** |
| D Hybrid LCP overlay | Implemented on hybrid | **Rejected** (late LCP / marginal) |

**Selected:** **Option C** — `RootAppShellSwitcher` + `PublicCatalogShell` for guest catalog paths; `InteractiveAppShell-B4WZZWGy.js` loaded only when leaving public explore or when stored credentials exist.

Full React SSR remains blocked until a **dedicated public root layout** with `ssr: true` is framework-validated (out of scope).

---

## 08 — Explore proof of concept

| Requirement | Status |
| --- | --- |
| Meaningful HTML (`seo-prerender` + registry head) | **Yes** |
| 62 models + navigation | **Yes** (API via hairstyles hook) |
| `/explore`, `/en/explore`, `/ru/explore` | **200**, hreflang **4** |
| No duplicate visible static shell | **Yes** (overlay removed) |
| Try-on links | **Yes** (regression spec pass) |
| LCP ≤ 2.5 s | **No** |

Initial HTML: `docs/mysaloon-v3-qa/ab-lighthouse-public-shell/explore-run1.json` (network traces in same files).

---

## 09 — International SEO

Unchanged from hybrid branch; Playwright SEO **4/4** on `:3012`. No new translated hairstyle slugs.

---

## 10 — Performance budgets (Explore mobile lab)

| Budget | Target | Measured (C) |
| --- | ---: | ---: |
| LCP | ≤ 2500 ms | **11286 ms** |
| CLS | ≤ 0.1 | **0.068** |
| Performance | ≥ 90 | **57** |
| SEO | ≥ 95 | **100** |
| A11y | ≥ 95 | **100** |
| Initial JS gzip | (reduce) | **~289 kB** (unchanged order of magnitude) |
| TTFB | — | **~4 ms** |

**Remaining blocker:** **~289 kB gzip** synchronous entry still loads Radix/router/query before first paint.

---

## 11 — Expansion gate

**FAILED** — no measurable LCP/Perf win. **Do not** extend public shell to home/guides until entry bundle split lands.

---

## 12 — Regression suite

| Suite | Result |
| --- | --- |
| Production build | **PASS** |
| Vitest | **99** pass, 3 skip |
| `content_seo` | **4/4** |
| Playwright SEO | **4/4** |
| Playwright polish | **13** pass, 1 skip |
| Playwright scanner | **6/6** |
| Hairstyles count | **62** (API via QA DB) |

Physical camera **not claimed**.

---

## 13 — Security

Guest explore shell does not render auth tokens or private history. `InteractiveAppShell` still enforces guards when loaded. No public cache of personalized responses added.

---

## 14 — Backup readiness

Reviewed `docs/MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md` + `deploy/vps/pg-backup-once.sh` — syntax OK; **no live pg_dump**.

---

## 15 — Changed files

| Path | Role |
| --- | --- |
| `components/shell/RootAppShellSwitcher.tsx` | Public vs interactive routing |
| `components/shell/PublicCatalogShell.tsx` | Light provider tree |
| `components/shell/InteractiveAppShell.tsx` | Lazy full app chrome |
| `lib/public-shell-paths.ts` | Explore catalog detection |
| `routes/__root.tsx` | Switcher; skip auth `beforeLoad` on public paths |
| `styles/fonts-space-grotesk.css` | Font out of JS entry |
| `server.ts` | Removed explore Nitro LCP overlay |
| `scripts/run-controlled-ab-lighthouse.mjs` | A/B harness |

---

## Release recommendation

**Do not merge or deploy.** Preserve production `3caad448`. Owner may approve follow-up: **public TanStack entry / split root route tree** (framework-supported) before expanding beyond Explore.

**Final commit:** `daa2d185` on `feat/mysaloon-public-rendering-performance`.