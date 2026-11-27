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
