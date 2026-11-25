# MySaloon SEO Implementation Report

**Date:** 2025-11-25  
**Canonical origin:** `https://mysaloon.uz` (apex)  
**App:** `apps/user` (TanStack Start + Nitro, global `ssr: false` unchanged)

---

## 1. Executive summary

Production SEO stack: centralized registry under `apps/user/src/seo/`, Nitro handlers for `sitemap.xml` / `robots.txt`, server-side HTML injection (meta, canonical, hreflang, JSON-LD, crawler H1), public guest-view routes, Morf/marketing landing pages (UZ/RU/EN), dynamic sitemaps with quality gates, nginx www→apex 301, Vitest + Playwright coverage.

---

## 2. Canonical domain

- `SITE_ORIGIN = https://mysaloon.uz` in `apps/user/src/seo/constants.ts`
- `public-origin.ts`, `salon-seo.server.ts`, `morph-share-seo.server.ts` aligned to apex
- Nginx: `deploy/vps/nginx/mysaloon-user.conf` — `www.mysaloon.uz` → `301 https://mysaloon.uz$request_uri`

---

## 3. SEO registry

| Module | Role |
|--------|------|
| `seo/constants.ts` | Apex origin, locales |
| `seo/content/landings.ts` | Premium UZ/RU/EN copy |
| `seo/registry.ts` | Page resolution |
| `seo/build-head.ts` | `buildHead`, hreflang, canonical |
| `seo/json-ld.ts` | WebSite, Service, HairSalon, FAQPage (no fake ratings) |
| `seo/noindex.ts` | Private route list |
| `seo/sitemap*.ts` | Static + dynamic URL builders |

---

## 4. Public sitemap endpoints

| URL | Content |
|-----|---------|
| `https://mysaloon.uz/sitemap.xml` | Sitemap index |
| `https://mysaloon.uz/sitemap-static.xml` | Marketing + platform URLs (3 locales where applicable) |
| `https://mysaloon.uz/sitemap-morf.xml` | Morf AI landing cluster |
| `https://mysaloon.uz/sitemap-salons.xml` | Public salons (name + cover or description) |
| `https://mysaloon.uz/sitemap-styles.xml` | Hairstyles (image + description or tags) |
| `https://mysaloon.uz/sitemap-barbers.xml` | Barbers (display name + avatar) |
| `https://mysaloon.uz/robots.txt` | Allow `/`, Disallow `/api/`, `/dev/`, `/wallet` |

**Estimated URL count (static only, build-time):** ~36 indexable marketing/platform URLs across static + morf sections, plus dynamic totals from live API (salons/styles/barbers; typically hundreds when API is reachable).

---

## 5. Guest-readable routes (auth)

Updated `apps/user/src/lib/auth-routes.ts`: guests may **view** `/explore`, `/explore/:id`, `/salon/:id`, `/barber/:id`, Morf landings, `/morf-ai/share|look/:id`, locale marketing `/ru|/en/*`. Login still required for booking actions, wallet, bookings list, history, etc.

---

## 6. New landing routes

| UZ path | Locales |
|---------|---------|
| `/morf-ai` | `/ru/morf-ai`, `/en/morf-ai` |
| `/morf-ai/try-on` | `/ru|/en/...` |
| `/morf-ai/hairstyles` | |
| `/morf-ai/hair-care` | |
| `/morf-ai/ingredient-scanner` | |
| `/morf-ai/chat` | |
| `/morf-ai/weather-care` | |
| `/booking` | `/ru/booking`, `/en/booking` |
| `/ru`, `/en` | Localized home copy |

UI: `components/seo/SeoLandingPage.tsx` (hero, bullets, FAQ, CTAs). **Studio** not in SEO copy (`MORPH_STUDIO_ENABLED = false`).

---

## 7. HTML injection

`apps/user/src/lib/seo-html-inject.server.ts` wired from `server.ts` for HTML GET responses: registry landings, salon, explore style, morph share/look, noindex private shells.

---

## 8. Structured data policy

- **WebSite** + **SearchAction** → `/map`
- **Organization** (footer + landings)
- **Service** / **SoftwareApplication** on Morf landings
- **HairSalon** from salon API fields only; **aggregateRating only if review count exists** (currently omitted)
- **FAQPage** only from real FAQ blocks in registry

---

## 9. Tests

- Vitest: `src/seo/seo.test.ts`, `src/lib/sitemap-handlers.test.ts`, updated `auth-routes.test.ts`
- Playwright: `e2e/seo.spec.ts` (robots, sitemap index, morf landing title/canonical)

Local: `npm run build`, `npm run test` — passed.

---

## 10. Deploy / smoke (manual VPS)

1. Pull, `npm run build` in `apps/user`
2. Restart `mysaloon-user` service
3. `nginx -t && systemctl reload nginx`
4. `curl -I https://mysaloon.uz/sitemap.xml`
5. `curl https://www.mysaloon.uz/` → `301` → apex

No destructive VPS deploy run from this agent session.

---

## 11–16. GSC submission checklist

Submit in [Google Search Console](https://search.google.com/search-console) property **`https://mysaloon.uz`**:

### Sitemaps (add once)

- `https://mysaloon.uz/sitemap.xml`

### Priority URLs to inspect / request indexing

**Platform**

- `https://mysaloon.uz/`
- `https://mysaloon.uz/map`
- `https://mysaloon.uz/explore`
- `https://mysaloon.uz/booking`
- `https://mysaloon.uz/for-salons`
- `https://mysaloon.uz/privacy-policy`
- `https://mysaloon.uz/terms-of-use`

**Morf AI (UZ)**

- `https://mysaloon.uz/morf-ai`
- `https://mysaloon.uz/morf-ai/try-on`
- `https://mysaloon.uz/morf-ai/hairstyles`
- `https://mysaloon.uz/morf-ai/hair-care`
- `https://mysaloon.uz/morf-ai/ingredient-scanner`
- `https://mysaloon.uz/morf-ai/chat`
- `https://mysaloon.uz/morf-ai/weather-care`
- `https://mysaloon.uz/ai-style`
- `https://mysaloon.uz/ai-style/chat`

**Locale samples (RU/EN)**

- `https://mysaloon.uz/ru`
- `https://mysaloon.uz/en`
- `https://mysaloon.uz/ru/morf-ai`
- `https://mysaloon.uz/en/morf-ai`
- `https://mysaloon.uz/ru/morf-ai/try-on`
- `https://mysaloon.uz/en/booking`

**Dynamic (sample after sitemap crawl)**

- Pick 3–5 salon URLs from `sitemap-salons.xml`
- Pick 3–5 `https://mysaloon.uz/explore/{styleId}` from `sitemap-styles.xml`

### Validation

- Confirm **canonical** and **hreflang** in page source on landings
- Confirm **www** redirects to apex
- Confirm `/wallet` returns `noindex` when HTML is served

---

## Blockers / notes

- Dynamic sitemap counts depend on Django API availability at build/runtime.
- Playwright SEO e2e requires dev/preview server (`npm run test:e2e` in `apps/user`).
- GSC verification token unchanged (not stored in repo).