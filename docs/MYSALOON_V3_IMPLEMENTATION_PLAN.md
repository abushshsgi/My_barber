# MySaloon V3 implementation plan

Controlled phases. This document records what this branch did and what is still open. It is not a claim that every phase is finished.

## Done in `feat/mysaloon-v3-ecosystem`

### Phase 0

Audit of tokens, layout shell, guides, explore, Morf routes, scanner branch, and Hair Advisor routes. Written to `docs/MYSALOON_V3_AUDIT.md`.

### Phase 1

Wide public layout for guides and explore. Article measure set to `46rem`. H1 scale reduced below `lg`. Table of contents is a disclosure under `lg` and a sticky column from `lg`.

### Phase 2

`GuidesDiscovery` replaces the plain list on `/guides` and `/$locale/guides`. Search is debounced. Categories come from real rows. States: loading, empty published set, no matches, API error. Drafts stay off the public API.

List endpoint returns a card payload: slug, locale, category, title, excerpt, cover, author, `published_at`, `reading_minutes`, `published_locales`. The markdown body stays on the detail endpoint.

### Phase 3, partial

`/explore` renders `ExploreDesktopPage` below `lg` as well as above it. The salon-paused screen is no longer used for the hairstyle catalog. Detail pages and try-on routes were not rewritten.

## Not done in this branch

### Phase 4

Morf intent routing and the chat UI stay as they are.

### Phase 5

Scanner UI and Hair Advisor result layout stay as they are. The release-candidate branch was not merged.

### Phase 6

A shared recommendation service beyond `related_slugs` / `related_style_ids` and `rankGuides` was not added.

### Phase 7, partial

Existing canonical, hreflang, and sitemap rules remain. Guide search is client-only. Lighthouse was not run. Field Core Web Vitals were not available.

### Phase 8, partial

Vitest for discovery ranking and the existing SEO tests. Django content tests, including a list response without `content`. Playwright, a full production build, and a full TypeScript project check were not run in this pass.

### Phase 9

Owner review before any production deploy and before any article is published.

## Later work, in order

1. Publish approved Phase 1 articles, then confirm the guides grid, sitemap, and hreflang with live rows.
2. Review explore copy that says "trend" and only keep it where there is a real signal.
3. Touch scanner or advisor UI only on a branch that does not mix unverified RC commits with unrelated design edits.
4. Measure Lighthouse on the deployed build, separate from field CrUX.
