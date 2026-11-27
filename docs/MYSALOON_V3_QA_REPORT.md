# MySaloon V3 QA

Date: 2026-11-27  
Environment: local Vite `http://127.0.0.1:3000` and local SQLite API with draft preview. Not production.

## Automated

| Suite | Result |
| --- | --- |
| Vitest `guide-discovery`, `article-markdown`, `seo`, `image-seo` | 19 passed |
| Django `content_seo` | 4 passed. Public draft detail is 404. English published list row has no `content` field. Russian draft locale lists nothing. |
| ESLint on the touched guide and layout files | Clean after format. |

Not run: full `tsc`, production `vite build`, Playwright, Lighthouse. No Lighthouse score is claimed. Physical devices were not used.

## Visual review

Screenshots are photographs of the local app, saved under `docs/mysaloon-v3-qa/screenshots/`.

| File | What was checked |
| --- | --- |
| `v3-guides-860.png` | Guides at 860px uses the shell width, search is visible, and the empty state does not show drafts. |
| `v3-guides-mobile.png` | Same page at 390px. One column, search, no horizontal overflow in the shot. |
| `v3-article-860.png` | Try-on draft. Title is one line. Column is wide enough to read. Hero is the existing French Crop catalog image. |
| `v3-explore-860.png` | Catalog, not the paused salon screen. Three image columns and the existing Morf card. |

Measured in the browser at 860px on the try-on article: main about 845px, H1 and body paragraph about 775px, H1 line count 1. Document title `Virtual soch turmagini sinab ko'rish | Morf AI`.

Explore at the same width reported 53 images and did not contain the "Tez orada" paused copy.

## Not visually approved

These screens were not captured in this pass, so they are not marked approved:

- Guides desktop at 1440 with published cards (there are zero published articles).
- Article at 320, 768, 1280, and 1920.
- Explore at 390 and 1440.
- Hairstyle detail, Morf, scanner, product-found, and advisor result.

The red maintenance banner is the existing site banner.
