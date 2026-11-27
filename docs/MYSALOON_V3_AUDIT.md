# MySaloon V3 audit

Date: 2026-11-27  
Branch at audit start: `feat/seo-phase1-content` (`1daecf14`)  
Work branch: `feat/mysaloon-v3-ecosystem`  
Scanner release-candidate branch `feat/scanner-v2-release-candidate` (`38fabe6a`, one docs commit ahead of its remote) was not checked out, merged, or deployed.

Untracked local junk (`apps/user/android/`, eslint output, test results, SQLite files, lighthouse JSON, tmp JSON) was left untouched.

## Git

| Branch | Role |
| --- | --- |
| `main` / `origin/main` | `f0573e39` — Scanner V2 is already on the Hair Advisor pipeline |
| `feat/seo-phase1-content` | Phase 1 guide drafts and article page. Pushed. |
| `feat/scanner-v2-release-candidate` | Separate. One local docs commit. Not used for this work. |
| `feat/mysaloon-v3-ecosystem` | This pass. Created from the SEO branch so that work is kept. |

Production was not deployed. Article drafts were not published. `CONTENT_DRAFT_PREVIEW` stays off in production.

## Design system

Source of truth: `apps/user/src/styles.css`.

Light tokens are neutral: `--foreground` near-black, `--muted-foreground` gray, `--surface` / `--surface-2`, `--border`. Accent is the foreground, not a second brand color. Dark theme mirrors the same names. Type uses Space Grotesk for display. Icons are lucide. Layout shell is `UserLayout`. Below `lg` (1024px) most pages sit in `max-w-md` unless the mobile dock, a full-bleed flow, or a wide public path applies.

## Classification

| Area | Class | Why |
| --- | --- | --- |
| Theme tokens | KEEP | Already match the black/white editorial look. No new palette. |
| `UserLayout` phone column | IMPROVE | Guides and explore detail were capped at `max-w-md` below 1024px, so an 860px tablet looked like a phone. |
| `/guides` index | IMPROVE | Was a single column of titles inside `max-w-3xl` on desktop and the phone column below `lg`. |
| `/guides/{slug}` | IMPROVE | Reading column and `md:text-5xl` title were too tight and too large at tablet width. |
| Content API | KEEP + IMPROVE | Published-only list/detail stays. List no longer sends the full markdown body. |
| Phase 1 article copy | KEEP | Drafts in `phase1_articles.py`. Not republished. |
| SEO inject, sitemap, hreflang | KEEP | Same injector and published-only sitemap. |
| `/explore` catalog | IMPROVE | Desktop catalog already exists. Below `lg` the route rendered the salon-paused screen, so the 62 models were hidden on phone and tablet. |
| `/explore/{id}` and try-on route | KEEP | Existing mobile/desktop detail and `/explore/{id}/try`. No second try-on pipeline. |
| Try-on reference images | KEEP | Paths were not edited. |
| Morf AI routes and intent stack | KEEP | Existing `/ai-style` and `/morf-ai/*`. Not rebuilt. |
| Scanner V2 engine | KEEP | On `main`. This pass does not change scanner code or merge the RC branch. |
| Hair Advisor result and AI contract | KEEP | Existing pipeline. No second advisor and no new score fields. |
| Analytics allowlist | IMPROVE | Added `guides_search` and `guides_category_selected`. No raw images or profile fields. |
| Home, map, booking pause | KEEP | Still paused on small screens. Only `/explore` was opened, because it is the hairstyle catalog, not salon booking. |

Nothing was deleted. Unused-code removal was not justified.

## Seven experiences

1. Guides discovery — weak list. Improved in this pass.
2. Article reading — narrow shell. Width and heading scale fixed. Copy stays draft.
3. Explore — catalog existed for `lg+` only. Now the same catalog renders at all widths.
4. Hairstyle detail — already has image, metadata, and the real try-on CTA. Left in place.
5. Morf AI — entry remains `/ai-style` and the marketing pages under `/morf-ai`. Explore still links there.
6. Smart Scanner — preserved. Physical-device checks stay unverified. See `docs/scanner-v2-release-candidate-report.md`.
7. Hair Advisor — preserved at `/ai-style/care/ingredient`. Article 3 already points there.

## Layout cause

`UserLayout` applied `max-w-md` (28rem) whenever the mobile dock was hidden. Guide routes do not show that dock, so at 860px the article lived in a centered phone column, then inside another `max-w-[40rem]`. Measured after the fix at 860px: shell about 845px, title and paragraph about 775px, title on one line.
