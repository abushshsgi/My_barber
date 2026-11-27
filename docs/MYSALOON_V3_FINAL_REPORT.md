# MySaloon V3 final report

Date: 2026-11-27  
Branch: `feat/mysaloon-v3-ecosystem`  
Base: `feat/seo-phase1-content` at `1daecf14`  
Scanner RC: not merged. `main` remains `f0573e39`.

## Architecture found

The user web app is TanStack Start in `apps/user`. Public pages share `UserLayout`. Below 1024px the shell used a 28rem column unless a route was docked or full-bleed. Guides and article SEO already live in `content_seo` and `injectSeoIntoHtml`. Explore already has a desktop catalog of the existing models and a detail page whose try-on link is `/explore/{id}/try`. Morf, the scanner, and Hair Advisor already have routes. Production was not redeployed. The earlier SEO note that the API runs on the VPS was not re-checked in this session.

## What changed

- Guides and explore style pages are wide public pages, so an 860px window is no longer a phone column.
- `/guides` and the Russian and English guide indexes share `GuidesDiscovery`: search, real categories, featured row, grid, and empty/error states.
- Article title scale and reading measure were adjusted. A short table of contents collapses under `lg`.
- The article list API omits markdown and adds `reading_minutes`.
- `/explore` shows the existing catalog on phone and tablet.
- Analytics allowlist includes `guides_search` and `guides_category_selected`. Search events send length, not the query string.

## What was preserved

- Phase 1 article slugs, drafts, and the rule that drafts are not public.
- Sitemap, canonical, and hreflang behavior.
- Try-on reference images and the try-on route.
- Morf AI, Scanner V2, and Hair Advisor pipelines.
- Home, map, and booking pause on small screens.
- No new compatibility percentages or health claims.

## Removed

No components were removed. `/explore` stopped rendering `MysaloonPausedScreen`. That screen still exists for the paused booking surfaces.

## New files

- `apps/user/src/components/guides/GuidesDiscovery.tsx`
- `apps/user/src/lib/guide-discovery.ts`
- `apps/user/src/lib/guide-discovery.test.ts`
- The docs in this set and `docs/mysaloon-v3-qa/screenshots/`

## API

`GET /api/v1/content/articles/?locale=` returns card fields only. Detail is unchanged and still hides drafts unless preview is explicitly enabled.

## SEO

No second SEO system. Guide search does not create crawlable query URLs. Unpublished articles stay out of the list and out of `sitemap-blog`.

## AI

No model, prompt, or advisor schema change.

## Performance

No Lighthouse run and no field CrUX sample. The list payload is smaller because article bodies are no longer sent with every card. Explore on a phone now loads the catalog that previously loaded only at `lg+`. That is more image work on small screens. Cards below the fold still use the existing grid's lazy images. This was not benchmarked.

## Tests

Vitest 19 passed. Django `content_seo` 4 passed. See `docs/MYSALOON_V3_QA_REPORT.md`.

## Screenshots

`docs/mysaloon-v3-qa/screenshots/v3-guides-860.png`  
`docs/mysaloon-v3-qa/screenshots/v3-guides-mobile.png`  
`docs/mysaloon-v3-qa/screenshots/v3-article-860.png`  
`docs/mysaloon-v3-qa/screenshots/v3-explore-860.png`

Before this pass, the same article at roughly 860px was a centered phone column with a three-line title. After, the title is one line and the text uses the shell width up to the 46rem measure.

## Blockers

- Owner approval before publish or production deploy.
- Zero published articles, so the guides grid cannot be reviewed with real cards yet.
- Scanner physical checks remain unverified.
- Morf, scanner, and advisor screens were not redesigned.
- Full breakpoint matrix and Lighthouse were not run.
- Explore still uses existing "trend" wording. That copy was not rewritten.

## Deployment readiness

Not ready. Do not deploy this branch and do not publish drafts until the owner reviews the screenshots and the remaining scope in `docs/MYSALOON_V3_IMPLEMENTATION_PLAN.md`.

## Phase 2 — 2026-11-27 later the same day

SEO commit `1daecf14` is still on `feat/seo-phase1-content` and is the parent of this branch. Articles stayed `draft`. Public list body was `[]` (2 bytes). A preview detail was 4401 bytes and `status=draft`, CTA `/ai-style`. Local Django on port 8000 was still the SQLite process (`/health/` 200). It was not stopped for this pass, so the Expo scanner session pointed at `192.168.1.13:8000` was not interrupted. Production API was not used.

### Layout measurements

| Width | Page | Result |
| --- | --- | --- |
| 1440 | Try-on article | Viewport 1440. Paragraph about 874px. No horizontal overflow. Title `Virtual soch turmagini sinab ko'rish \| Morf AI`. Canonical `https://mysaloon.uz/guides/virtual-soch-turmagini-sinab-korish`. Robots `noindex, nofollow`. |
| 860 | Privacy policy | Content stayed near 450–490px. The wide shell did not open this page. |
| 1024 | `/explore/men-textured-crop` | One H1, `Textured Crop`. Try-on href `/explore/men-textured-crop/try`. Length link `/explore/category/short-haircuts`. Related styles rendered. |
| 390 | Article, explore, detail | Readable single column. Explore shows the catalog and the mobile dock, not the salon pause screen. |

A title on one line is not required. At 1440 the article title wraps once. At 390 it wraps to two lines.

### Hairstyle detail

From 768px up the existing two-column detail is used (image plus name, description, try-on, salon). Below that, the existing mobile gallery and sticky actions stay. Related styles use category, length, audience, and shared tags, then a stable id order. Published guides whose `related_style_ids` contain the style are listed. None are published, so that list is empty. A length chip links to the existing short, medium, or long category route. There is no hairstyle save control in the current detail page. Salon favorites were left alone.

Guide articles that mention a style now link to that length category. Selecting a guide category offers the matching existing route: styles → `/explore`, hair-advisor → `/ai-style/care/ingredient`, morf-ai → `/ai-style`.

### SEO and performance that were actually checked

- Draft detail without `preview=1` stays 404 (Django tests, 4 passed again).
- List payload is `[]` while drafts are unpublished. The card serializer now also returns `related_style_ids` and still omits `content`.
- Hydrated article head had the canonical and `noindex`. Hreflang stays empty until a locale is published.
- No Lighthouse run, no bundle byte delta, no CLS number, no Google indexing result.

### Tests

Vitest: `related-hairstyles` 2, `guide-discovery` 3, `article-markdown` 4. Django `content_seo` 4 passed.

### Screenshots

New files in `docs/mysaloon-v3-qa/screenshots/`: `v3-article-desktop.png`, `v3-article-mobile.png`, `v3-detail-desktop.png`, `v3-detail-mobile.png`, `v3-explore-mobile.png`, `v3-morf-860.png`, `v3-scanner-auth.png`. Earlier shots `v3-guides-860.png`, `v3-guides-mobile.png`, `v3-article-860.png`, `v3-explore-860.png` still apply.

The desktop review images are cropped on the right by the capture panel when the layout is wider than the panel. The numbers above come from `window.innerWidth` and element boxes, not from the cropped picture.

### Next phase

Owner visual approval. After that, signed-in scanner and advisor screens only, using `docs/MYSALOON_V3_AI_UI_PLAN.md`. Do not start that redesign in this commit.
