# MySaloon V3 user journeys

Routes below were checked in the user app. Product CTAs that have no `/$locale` file stay on the unprefixed path.

## What is connected now

| Journey | Path |
| --- | --- |
| A. Search to a guide | `/guides` or `/ru/guides` or `/en/guides` lists only published articles. A card opens `/guides/{slug}` with the same locale prefix. |
| A. Guide to a feature | Try-on article CTA `/ai-style`. Textured Crop CTA `/explore/men-textured-crop/try`. Shampoo CTA `/ai-style/care/ingredient`. Marketing pages `/morf-ai/try-on` and `/morf-ai/ingredient-scanner` are locale-prefixed in the article body. |
| B / C. Explore to try-on | `/explore` shows the catalog at every width. A card opens `/explore/{id}`. The existing try-on control goes to `/explore/{id}/try`. |
| G. Guide to a haircut | Related style cards link to `/explore/{id}` and that style's try-on route. |

Draft articles are absent from the public list, so journey A has an empty state until an editor publishes them.

## Ranking used by guides

`rankGuides` in `apps/user/src/lib/guide-discovery.ts`:

1. Exact normalized title.
2. Title prefix.
3. Title contains the query.
4. Category contains the query.
5. Excerpt contains the query.

Category chips only appear for categories that exist on the returned rows. There is no popularity score and no extra model call. Search analytics store the query length, not the text.

## Journeys left on the existing product

| Journey | Status |
| --- | --- |
| D. Morf to scanner to advisor | Existing `/ai-style` and `/ai-style/care/ingredient`. Not rewired in this pass. |
| E. Unknown barcode to a label photo | Existing scanner fallback. Not changed. |
| F / H. Advisor result back into Morf | Existing advisor actions. Not changed. |

Authentication is still required only where the current route guard says so. Public guides and explore style pages stay readable without an account.
