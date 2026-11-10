# MySaloon performance baseline (audit snapshot)

Captured during the optimization pass. Re-measure in production with Web Vitals, Lighthouse, and RUM.

## Architecture bottlenecks (identified)

| Area | Finding |
|------|---------|
| **DatabaseMediaStorage** | Every `/media/*` hit loads full `BinaryField` from Postgres unless cached. No prior Redis body cache or `304` support. |
| **Home hero (desktop)** | `BazaarHeroBanner` used `loading="lazy"` on all slides and Pexels `w=1200` even for mobile viewports. |
| **Home hero (mobile catalog)** | `HomeMobileBanner` same pattern (`lazy`, 900px bucket → 1200px upstream). |
| **Mobile “home”** | `index.tsx` redirects sub-desktop users to `/ai-style` when app shell ≠ mysaloon; LCP often `try-on-selfie-hero.png` without `fetchPriority`. |
| **Try-on history** | Grid thumbnails loaded full JPEG from `/media/ai-style/tryon-results/…` (often 1024px+). |
| **Nitro API proxy** | `/media` fully buffered via `arrayBuffer()` (memory + TTFB). Public `immutable` cache applied to all media paths. |
| **User Nginx** | All traffic to `:3000`; no edge cache for `/media` or static assets (snippet prepared for review). |
| **Analytics** | Client batches (15 events / 1.2s flush) — low risk; GA single pageview per navigation. |

## Homepage API fan-out (`useHomeData`)

Typical desktop mysaloon shell load (parallel React Query):

- `GET /api/v1/salons/` (page_size 100) + optional nearby
- `GET /api/v1/barbers/` list + optional nearby
- `GET /api/v1/hairstyles/` men + women when audience = `all`
- Images: salon covers via `/media/…` (Postgres), hero via `/covers/pexels/` proxy

Salon list views already use `select_related` / `prefetch_related` (see `salons/views.py`).

## Image pipeline

1. **Salon covers** → `SalonCoverImg` → same-origin `/media/` → Django `serve_media` → `StoredMedia.data`
2. **Hero banners** → `pexelsCoverUrl` → Nitro proxy → `images.pexels.com` with `w` query
3. **Hairstyles** → static `/hairstyles/…webp` when possible (`preferStaticHairstyleUrl`)
4. **Try-on results** → full JPEG in DB; card WebP added in this pass (`*_card.webp`)

## Targets (75th percentile)

| Metric | Target |
|--------|--------|
| LCP | ≤ 2.5s |
| INP | ≤ 200ms |
| CLS | ≤ 0.1 |

Production before/after numbers require deployment + CrUX or field数据; do not treat this file as measured CrUX.

## Re-measurement checklist

1. Lighthouse mobile on `https://www.mysaloon.uz/` (desktop shell) and `/ai-style` (default mobile).
2. Compare `/media/` TTFB and size for a salon cover before/after Redis warm.
3. WebPageTest: hero slide 1 transfer bytes (expect ~480–720w Pexels vs prior 1200w).
4. Try-on history: grid cell image KB (JPEG full vs `_card.webp`).
