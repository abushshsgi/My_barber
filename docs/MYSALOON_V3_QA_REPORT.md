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

## Later the same day

| File | Review |
| --- | --- |
| `v3-article-desktop.png` | Article at an emulated 1440px. Title wraps once. Reading column measured at about 874px. The picture crops the right edge of the shell. |
| `v3-article-mobile.png` | Article at 390px. Two-line title, full-width hero inside the gutter. |
| `v3-detail-desktop.png` | Textured Crop at 1024px. Image and sidebar. Try-on and salon actions. Link to short haircuts. |
| `v3-detail-mobile.png` | Same style at 390px. Sticky try-on label truncates. Existing gallery. |
| `v3-explore-mobile.png` | Catalog at 390px with the bottom dock. |
| `v3-morf-860.png` | Public Morf landing. Not restyled. |
| `v3-scanner-auth.png` | Scanner route sent the logged-out browser to auth. Scanner UI was not opened. |

`/privacy-policy` at 860px stayed in a column near 450–490px.

A first render of the detail page crashed on `imageUrl` because related cards were unwrapped twice. That is fixed. The reloaded page showed the try-on href and the short-haircuts link.

## Not visually approved

- Guides with published cards. There are still zero published articles.
- Article at 320, 375, 768, 1280, and 1920 as pictures. 1440 and 390 were measured or pictured.
- Signed-in scanner, product-found, and advisor result.
- Explore at 1440 as a full uncropped picture.

The red maintenance banner is the existing site banner.
