# MySaloon — international SEO release candidate

**Date:** 2026-11-28  
**Branch:** `feat/mysaloon-international-seo-release`  
**Base production SHA:** `3caad448`  
**Excluded:** split-bootstrap, public shell, hybrid LCP overlay, `routeTree.public`, experimental preload tuning  

---

## Scope (included)

| Change | Purpose |
| --- | --- |
| `routes/$locale.explore.tsx` | `/en/explore`, `/ru/explore` file routes |
| `routes/explore.tsx` + `ExploreRoutePage` | Registry head, locale-aware client UI |
| `lib/explore-prerender.server.ts` | Meaningful `seo-prerender` catalog snapshot in initial HTML |
| `lib/seo-html-inject.server.ts` | Hreflang cluster, localized metadata |
| `seo/content/landings.ts` | `explore.trilingual: true`, RU/EN copy |
| `seo/seo.test.ts`, `e2e/seo.spec.ts` | Regression guards |
| `routeTree.gen.ts` | Generated route registration |

**Explicitly not included:** `explore-lcp-shell.server.ts`, `injectExploreLcpShell` in `server.ts`, provider shell splits, async router fork, performance-only refactors.

---

## Verification

| Check | Result |
| --- | --- |
| Production build (`apps/user`) | **PASS** |
| Vitest (full user app) | **PASS** (see CI run in commit message evidence) |
| Vitest `seo.test.ts` | **11/11** |
| Playwright SEO | **4/4** |
| Port 8000 | **Untouched** |
| Live production deploy | **No** |

### URLs validated (lab)

- `/explore` — 200, `lang=uz`, hreflang cluster  
- `/en/explore`, `/ru/explore` — 200, localized `html lang`, reciprocal hreflang  
- Sitemap/robots — 200 (Playwright)  
- Wallet — `noindex` preserved  

Hairstyle detail URLs remain `/explore/{id}`; 62 models unchanged; Try-On routes unchanged.

---

## Performance impact (SEO-only vs `3caad448` source)

No bundle-split or bootstrap changes on this branch. **Expect lab Explore metrics in the same family as production source** (~6.7 s archived pre-hybrid lab or ~11 s same-session Nitro lab — environment dependent).

**Do not compare** live `mysaloon.uz` TLS/geo numbers to local `:301x` Nitro runs.

---

## Release recommendation

**Candidate for owner-approved cherry-pick to release branch** — SEO/i18n only, independent of failed performance experiments.

**Pre-merge checklist (owner):**

1. Run `content_seo` + full Playwright on staging with QA DB  
2. Confirm hairstyle count API = 62  
3. Execute production backup runbook if deploying with backend  
4. **Do not** merge performance experimental branches in the same release  

---

## Commit

Record final SHA on this branch after `git push` (owner review gate).