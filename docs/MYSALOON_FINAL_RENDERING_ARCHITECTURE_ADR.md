# ADR — MySaloon Explore rendering & performance architecture

**Status:** **ACCEPTED (stop further perf experiments)**  
**Date:** 2026-11-28  
**Production:** `3caad448` (stable)  
**Evidence branches:** `feat/mysaloon-split-bootstrap` (`68492f82`), `feat/mysaloon-international-seo-release` (`e0b5b309`)

---

## Context

Guest Explore lab LCP ~**10.8–11.3 s** (Nitro `:301x`, mobile simulate, API `:8001`, QA SQLite). Production live TLS measurements are **not** equivalent to this lab. Split-bootstrap reduced **initial JS gzip 289 → 194 kB** (−33%) but **Performance score stayed 57** and LCP improved only **~4%** (within run variance).

---

## Phase 1 — Baseline verification

| Control | Value |
| --- | --- |
| Lighthouse | v13.x family (ab manifests) |
| Form factor | Mobile, `throttling-method=simulate` |
| Server | Nitro prod build, `API_UPSTREAM_URL=http://127.0.0.1:8001` |
| Build D SHA | `68492f82` (POC `c6b5a700`) |
| Variability | Explore LCP spread ~10.7–11.4 s across 3 runs |

Archived **build A** (`3caad448`, ~6.7 s LCP) used a **different lab manifest family** — do not treat as same-session comparable to 11 s runs.

---

## Phase 2 — Complete LCP attribution (build D, run 2)

**LCP element (image):**  
`img` → `/hairstyles/men/personas/irland/mid-fade.webp`, alt “Trend uslublar” (Explore mobile hero).

**Lighthouse image subparts (sum ~475 ms):**

| Subpart | ms |
| --- | ---: |
| TTFB | 8 |
| Resource load delay | 22 |
| Resource load duration | 18 |
| Element render delay | 427 |

**Total LCP:** 10,789 ms → **~10,314 ms “pre-resource gap”** (not overlapping subparts — time before LCP resource phase).

**Sequential critical path (conceptual):**

1. Navigation → HTML (TTFB ~5–8 ms)  
2. CSS (`styles`, fonts preload) — not LCP-limiting alone  
3. Download/parse **index + vendor-router + vendor-query + vendor-i18n + vendor-radix** (~194 kB gzip set)  
4. `hydrateStart` → async `getRouter()` → `router.public`  
5. React mount: `__root` → `I18nProvider` → `PublicCatalogShell` → `UserLayout` → `ExploreRoutePage` → `ExploreMobilePage`  
6. Hero `<img>` inserted → image fetch (~40 ms) → paint (**LCP**)

**FCP ~6.1 s** — first paint still after large JS; **LCP ~4.7 s after FCP** — additional layout/route/render work until hero image wins LCP.

**Why −33% JS did not move LCP materially:** Remaining gap is **dominated by mandatory CSR depth**, not hero bytes. Image subparts are <5% of LCP. Radix scripting ~**658–850 ms** is **~6%** of LCP — removing it cannot close a **~10.3 s** gate.

---

## Phase 3 — Instrumentation (dev-only)

- `apps/user/src/lib/explore-perf-marks.ts` — Performance API marks on Explore/shell (DEV pathname guard).  
- `apps/user/scripts/extract-lcp-attribution.mjs` — parses LH JSON for subparts and bootup tables.  
- Artifacts: `docs/mysaloon-v3-qa/lcp-attribution-summary.json`

---

## Phase 4 — Radix audit (guest Explore)

`vendor-radix` **manualChunk** loads when **any** `@radix-ui/*` import executes in the bootstrap graph.

| Source (Explore guest) | Radix? | First-paint critical? |
| --- | ---: | ---: |
| `ProfileAccountEntry` → `/auth` link (split-bootstrap) | No | No |
| `MobileDockNav`, `AudienceSwitch`, explore grid | No direct Radix | No |
| Lazy `ExternalBrowserPrompt` / `FirstVisitOnboarding` / dialogs | Yes (when chunk loads) | **Deferred** — not hero blocker |
| Shared `ui/button` (Radix Slot) via **route tree** and layout barrels | **Yes** | **Contributes to vendor-radix chunk parse** |
| Desktop header (explore desktop / split layout) | Partial | Mobile LH still pulls vendor-radix |

**Conclusion:** Further Radix trimming is **incremental** (~hundreds of ms), not architectural LCP fix. Do **not** remove accessible controls globally.

---

## Phase 5 — Router split (`routeTree.public`) risks

| Risk | Mitigation today | Severity |
| --- | --- | --- |
| Manifest drift vs codegen | Manual 9-route list | **Medium** — must update on new public URLs |
| Unknown routes | `NotFound` → `promoteToFullAppDocument()` hard nav | Acceptable for POC |
| Signed-in guest explore | Full router path if credentials | OK |
| `router.app` idle preload | `requestIdleCallback` 4 s | Possible bandwidth contention; experiment E showed **no LCP win** |
| Back/forward | Standard router | Untested exhaustively |
| Maintenance cost vs benefit | **−33% JS**, **−4% LCP** | **Not justified for production** |

**Recommendation:** **Do not ship** dual route trees.

---

## Phase 6 — Bounded experiment E (chosen)

**Option C:** Defer `router.app` preload until `load` + 8 s (reduce network contention).

| Metric | Before (split-bootstrap) | Experiment E |
| --- | ---: | ---: |
| LCP median | 10,789 ms | **10,910 ms** |
| TBT median | 107 ms | **144 ms** |
| Perf | 57 | 57 |

**Verdict:** **FAILED / inconclusive** — reverted to idle preload in tree before this ADR commit.

**Not pursued:** Hybrid static LCP overlay (regressed/scored LCP on B), further Radix stripping, dual client entry (unsupported).

---

## Phase 7 — Architecture comparison

| Approach | LCP lab (Explore) | JS initial | Complexity | Ship? |
| --- | --- | --- | --- | ---: |
| 1. Production `3caad448` CSR | ~6.7 s archived / ~11 s same-session | ~289 kB family | Low | **Yes (current)** |
| 2. Hybrid HTML shell | ~11.4 s | ~289 kB | Medium | **No** |
| 3. Public provider shell | ~11.3 s | ~289 kB | Medium | **No** |
| 4. Split bootstrap | ~10.8 s | **194 kB** | **High** | **No** |
| 5. Preload defer (E) | ~10.9 s | 194 kB | Low | **No** |
| 6. Future: true public SSR / split root + `ssr:true` | Unknown | TBD | **Very high** | **Defer** |

---

## Decision

1. **STOP** performance architecture experimentation on Explore (no new shells/branches).  
2. **RETAIN** production `3caad448` behavior until a **framework-level public SSR** or **approved** isolated marketing origin is funded.  
3. **RELEASE independently:** `feat/mysaloon-international-seo-release` (`e0b5b309`) — SEO only.  
4. **REVERT / do not merge:** split-bootstrap, public shell, hybrid LCP inject for performance goals.  
5. **CHERRY-PICK SEO** after owner approval — see `docs/MYSALOON_INTERNATIONAL_SEO_RELEASE_REPORT.md`.

---

## Regression (split-bootstrap branch, last known)

| Suite | Result |
| --- | --- |
| Vitest | 101 pass, 3 skip |
| Playwright SEO | 4/4 |
| SEO-only branch Vitest | 96 pass, 3 skip |
| `content_seo` / scanner / polish | **Not re-run this pass** (owner staging) |

---

## Remaining bottlenecks

- Single CSR TanStack root with `ssr: false`.  
- ~**10.3 s** unattributed LCP gap = JS bootstrap + React depth before hero mount.  
- Full `vendor-radix` + router + query + i18n on critical path.  
- Third-party gtag ~100–160 ms scripting (secondary).

---

## Owner actions

- [ ] Review this ADR and SEO release report  
- [ ] Approve or reject `feat/mysaloon-international-seo-release` for cherry-pick  
- [ ] Do **not** approve performance branches for production  
- [ ] If LCP ≤2.5 s is mandatory, scope **new project**: public SSR root or static marketing app — not another provider shell

**ADR commit SHA:** (record on push to `feat/mysaloon-split-bootstrap`)