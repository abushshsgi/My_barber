# MySaloon V3 — targeted polish report

Date: 2026-11-27  
Branch: `feat/mysaloon-v3-ecosystem`  
Base commit before this pass: `356e5beb`  
Scanner V2 RC: not merged. `main` not changed. No production deploy or article publish.

## Verification summary

| Area | Vitest / Django | Visual | Notes |
| --- | --- | --- | --- |
| Scanner camera gate | 12 tests (`hair-advisor-scanner-logic`) | After screenshots pending local signed-in run | Automated only |
| Hreflang dedupe | 5 tests (`article-markdown`) | Not re-captured | Server + client fix |
| Sitemap API env | 2 tests (`base-url`) | Not run | Dev no longer silent prod default |
| Article list serializer | Django `content_seo` 4 OK | Not on live `:8000` process | Test DB proves omit `content` |
| Lighthouse | Not run | — | BLOCKED this pass |

**Vitest:** 28 passed in targeted suites (`hair-advisor-scanner-logic`, `article-markdown`, `base-url`, `seo`).  
**Django:** `content_seo` 4 passed.

---

## 02 — Scanner state consistency

| | |
| --- | --- |
| Original issue | Permission denied message while overlay/status showed “Avtomatik skanerlash faol”. |
| Root cause | `useSmartScanner` defaulted to `scanning` and status keys ignored `ScannerCameraGate`. |
| Files changed | `apps/user/src/lib/hair-advisor-scanner-logic.ts`, `apps/user/src/hooks/use-smart-scanner.ts`, `apps/user/src/components/hair-advisor-2/HairAdvisor2ScanPage.tsx`, `apps/user/src/components/hair-advisor-2/HairAdvisorScannerOverlay.tsx`, `apps/user/src/components/ai-style/HairAdvisorBarcodeCamera.tsx` |
| Solution | `resolveScannerUiPhase`, `canShowActiveScanAnimation`, camera lifecycle callbacks, torch disabled when camera not ready, shared `displayPhase` for overlay + desktop panel. |
| Regression test | `hair-advisor-scanner-logic.test.ts` (camera gate cases) |
| Before | `docs/mysaloon-v3-qa/screenshots/polish/before-scanner-permission.png` |
| After | Pending capture (`after-scanner-permission.png`) |
| Status | **FIXED BUT UNVERIFIED** (no physical camera QA) |

---

## 03 — Scan history empty state

| | |
| --- | --- |
| Original issue | History modal showed a lone dash. |
| Root cause | Empty branch rendered `—` with no copy or CTA. |
| Files changed | `HairAdvisor2ScanPage.tsx`, `uz.json`, `en.json`, `ru.json` |
| Solution | Loading / empty / error / unauthorized states; empty title, description, primary “scan product” action. |
| Regression test | Manual + scanner logic suite (no dedicated Playwright) |
| Before | `polish/before-history-empty.png` |
| After | Pending |
| Status | **FIXED BUT UNVERIFIED** |

---

## 04 — Hair Advisor result UI

| | |
| --- | --- |
| Original issue | Fixed compare bar overlapped warnings; hardcoded UZ strings; demo not labeled. |
| Root cause | `fixed bottom-0` dock; no i18n on result page. |
| Files changed | `HairAdvisor2ResultPage.tsx`, locale files |
| Solution | In-flow action section; demo banner; Morf / scan / compare actions; i18n keys under `hairAdvisor.*`; product placeholder unchanged in `HairAdvisor2ProductHeader`. |
| Regression test | — |
| Before / After | `polish/before-advisor-mobile.png` / pending |
| Status | **FIXED BUT UNVERIFIED** |

---

## 05 — Morf AI gallery icon

| | |
| --- | --- |
| Original issue | Gallery control looked like a black spot. |
| Root cause | Custom `GalleryStackMark` SVG used solid `fill="currentColor"` stack. |
| Files changed | `apps/user/src/components/ai-style/AiStyleSplitLayout.tsx` |
| Solution | Lucide `Images` icon with stroke. |
| Before / After | `polish/before-morf-gallery.png` / pending |
| Status | **FIXED BUT UNVERIFIED** |

---

## 06 — Maintenance announcement

| | |
| --- | --- |
| Original issue | Red bar, Uzbek on all locales, layout overlap. |
| Root cause | Hard-coded `bg-red-600`; copy already in i18n but banner styling fought layout tokens. |
| Files changed | `MaintenanceBanner.tsx` |
| Solution | Semantic `bg-surface` / `text-foreground`; existing dismissal and `data-maint-banner` offset preserved. |
| Status | **FIXED BUT UNVERIFIED** |

---

## 07 — UZ/RU/EN localization

| | |
| --- | --- |
| Issues | Explore filters, scanner/history, advisor result, explore age groups, model count subtitle. |
| Files changed | `en.json`, `ru.json`, `uz.json`, `ExplorePageToolbar.tsx`, `SalonCard.tsx`, `HairAdvisor2ResultPage.tsx` |
| Status | **PARTIALLY FIXED** (`HairAdvisor2ProductHeader` meta strings still UZ-hardcoded) |

---

## 08 — Explore layout (≈836px)

| | |
| --- | --- |
| Original issue | Catalog grid hidden under mobile dock. |
| Root cause | Dock padding used `3.5rem` while dock height uses `--mobile-dock` clamp. |
| Files changed | `layout-constants.ts`, `ExploreDesktopPage.tsx` |
| Solution | Padding aligns to `var(--mobile-dock)`; extra bottom padding on explore page below `lg`. |
| Before | `polish/before-explore-836.png` |
| After | Pending |
| Status | **FIXED BUT UNVERIFIED** |

---

## 09 — AI model count

| | |
| --- | --- |
| Original issue | Copy said “4 models” with three personas visible. |
| Root cause | Static subtitle; four model were planned, only three references in `EXPLORE_PERSONAS`. |
| Files changed | `ExploreDesktopPage.tsx`, `ExplorePageToolbar.tsx`, locale `explorePage.subtitle` now `{{count}}`. |
| Solution | Count from `listReadyExplorePersonas().length` (3); optional note if API list differs. |
| Status | **FIXED AND VERIFIED** (data-driven count in code/tests) |

---

## 10 — Hairstyle detail Try-On CTA

| | |
| --- | --- |
| Original issue | Mobile label truncated “O‘zingizda ko‘r...”. |
| Root cause | `truncate` on primary CTA span. |
| Files changed | `explore_.$styleId.tsx` |
| Solution | Full label, `text-sm leading-tight`, wider horizontal padding. |
| Before | `polish/before-detail-tryon-390.png` |
| Status | **FIXED BUT UNVERIFIED** |

---

## 11 — Hairstyle save

| | |
| --- | --- |
| Finding | Try-on save exists via `saved-ai-styles` / `AiStyleFlow`; explore **detail** has no save control (confirmed prior audit). |
| Status | **NOT FIXED** (documented; no new backend in this pass) |

---

## 12 — Article reading width

| | |
| --- | --- |
| Original issue | ~874px / ~86ch body at desktop. |
| Files changed | `GuideArticleView.tsx` |
| Solution | Body prose wrapped in `max-w-[70ch]` inside wide editorial shell; slightly larger desktop paragraph line-height. |
| Before / After | `polish/before-article-desktop.png` / pending |
| Status | **FIXED BUT UNVERIFIED** |

---

## 13 — Duplicate hreflang

| | |
| --- | --- |
| Original issue | Each alternate appeared twice after publish fixture. |
| Root cause | SSR inject + client `syncGuideDocumentHead` both emitted `<link rel="alternate">`; client only removed `data-guide-alternate` nodes. |
| Files changed | `GuideArticleView.tsx` |
| Solution | Client removes all `link[rel=alternate][hreflang]` before re-inserting once. |
| Regression test | `article-markdown.test.ts` unique locale set |
| Status | **FIXED AND VERIFIED** (unit); hydrated DOM not re-shot |

---

## 14 — Sitemap environment isolation

| | |
| --- | --- |
| Original issue | Local sitemap hit production API when `API_UPSTREAM_URL` unset. |
| Files changed | `apps/user/src/lib/api/base-url.ts`, `base-url.test.ts` |
| Solution | Development/test default to `CONTENT_API_URL` / `VITE_API_URL` / `http://127.0.0.1:8000`; production URL only when `NODE_ENV` is production. |
| Status | **FIXED AND VERIFIED** (unit) |

---

## 15 — Content API serializer (runtime)

| | |
| --- | --- |
| Committed behavior | `SeoArticleCardSerializer` omits `content`. |
| Django tests | `test_published_locale_is_listed...` asserts `content` not in list item. |
| Live `:8000` process | Not restarted (Expo scanner session preserved). |
| Status | **FIXED AND VERIFIED** (test DB); **BLOCKED** live payload re-measure on port 8000 |

---

## 16 — Performance QA

| Status | **BLOCKED** — no Lighthouse run this pass |

---

## 17 — Automated regression tests

Added/updated:

- `hair-advisor-scanner-logic.test.ts` — camera gate
- `article-markdown.test.ts` — hreflang uniqueness
- `base-url.test.ts` — dev API upstream

Not run: Playwright, full monorepo Vitest, production build, Lighthouse.

---

## 18 — Screenshots

Before copies: `docs/mysaloon-v3-qa/screenshots/polish/before-*.png`  
After captures: **pending** signed-in local pass (same folder `after-*.png`).

---

## 19 — Git / environment safety

- Branch unchanged: `feat/mysaloon-v3-ecosystem`
- Port 8000 Django not stopped
- No merge, deploy, or publish

---

## Remaining limitations

1. Physical scanner and camera permission flows not device-tested.
2. After screenshots not captured in this session.
3. `HairAdvisor2ProductHeader` verification badges still need full i18n.
4. Hairstyle favorites on detail page not implemented.
5. Lighthouse / field CWV not measured.

---

## Final commit

Commit created after this report (see `git log -1` on branch).