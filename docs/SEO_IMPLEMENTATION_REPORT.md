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

## 10. Production deploy & smoke (verified 2026-11-25)

### Deploy

| Field | Value |
|--------|--------|
| **VPS host** | `mysaloon` (`89.45.45.32`) |
| **Tree** | `/opt/mysaloon/Mybarber` |
| **Command** | `sudo bash deploy/vps/deploy-frontends.sh user` |
| **Previous SHA** (`/var/lib/mysaloon/deployed-sha`) | `2ed51de2` (buildId `2ed51de`) |
| **Deployed SHA** | `0ac3646cae5f7cc4f857ad8cfb8f5009d8def9a8` |
| **buildId** | `0ac3646` (`apps/user/dist/client/version.json`, built `2026-11-25T08:07:31.399Z`) |
| **Services** | `mysaloon-user` **active** after restart; `nginx -t` OK, reload OK |
| **Scope** | user frontend + nginx configs (admin/barber not rebuilt) |

**Pre-deploy backups**

| Artifact | Path |
|----------|------|
| User `dist/` tarball | `/var/backups/mysaloon/user-dist__pre-seo.tar.gz` (~36 MB, pre-`0ac3646` dist) |
| Nginx site file | `/var/backups/mysaloon/mysaloon-user.conf__pre-seo.bak` |

Note: backup filenames were created from a Windows SSH one-liner where `$STAMP` did not expand on the client; paths above are as on disk. For future deploys, run backup commands **on the VPS shell** so timestamps are preserved.

**Rollback (user dist only)**

```bash
systemctl stop mysaloon-user
rm -rf /opt/mysaloon/Mybarber/apps/user/dist
tar -xzf /var/backups/mysaloon/user-dist__pre-seo.tar.gz -C /opt/mysaloon/Mybarber/apps/user
chown -R www-data:www-data /opt/mysaloon/Mybarber/apps/user/dist
systemctl start mysaloon-user
```

**Rollback (nginx www→apex only)**

```bash
cp /var/backups/mysaloon/mysaloon-user.conf__pre-seo.bak /etc/nginx/sites-available/mysaloon-user.conf
nginx -t && systemctl reload nginx
```

### Production smoke (`curl`, raw HTML — 2026-11-25 ~08:11 UTC)

| URL | HTTP | Content-Type | Title (sample) | Canonical | Crawler H1 |
|-----|------|--------------|----------------|-----------|------------|
| `https://mysaloon.uz/` | 200 | `text/html; charset=utf-8` | mysaloon.uz — Sartaroshxona va salonlarni onlayn band qiling | `https://mysaloon.uz/` | Salon va sartaroshxonalarni onlayn band qiling |
| `https://mysaloon.uz/sitemap.xml` | 200 | `application/xml; charset=utf-8` | — | — | — (valid sitemap index XML) |
| `https://mysaloon.uz/robots.txt` | 200 | `text/plain; charset=utf-8` | — | — | — (`Sitemap: https://mysaloon.uz/sitemap.xml`) |
| `https://mysaloon.uz/morf-ai` | 200 | `text/html; charset=utf-8` | Morf AI — Soch uslubini selfie bilan sinab ko'ring \| mysaloon.uz | `https://mysaloon.uz/morf-ai` | Morf AI — sochingiz uchun aqlli yordamchi |
| `https://mysaloon.uz/morf-ai/try-on` | 200 | `text/html; charset=utf-8` | Virtual try-on — selfie bilan soch uslubi \| Morf AI | `https://mysaloon.uz/morf-ai/try-on` | Selfie bilan soch uslubini sinab ko'ring |
| `https://mysaloon.uz/booking` | 200 | `text/html; charset=utf-8` | Salon bron qilish — bo'sh vaqtlar va onlayn to'lov | `https://mysaloon.uz/booking` | Salonni onlayn band qiling |
| `https://mysaloon.uz/ru/morf-ai` | 200 | `text/html; charset=utf-8` | Morf AI — Примерьте причёску по селфи \| mysaloon.uz | `https://mysaloon.uz/ru/morf-ai` | Morf AI — умный помощник для волос |
| `https://mysaloon.uz/en/morf-ai` | 200 | `text/html; charset=utf-8` | Morf AI — Try hairstyles on your selfie \| mysaloon.uz | `https://mysaloon.uz/en/morf-ai` | Morf AI — smart guidance for your hair |
| `https://www.mysaloon.uz/` | **301** | — | — | — | `Location: https://mysaloon.uz/` |

**Nginx warnings (non-fatal):** duplicate MIME `text/html` in `mysaloon-user.conf:44`; protocol options redefined in `mysaloon-barber.conf:17` (pre-existing).

**Local lint:** `npm run lint -w user-web` was started pre-deploy; eslint on Windows exceeded 6+ minutes without completing (deploy not blocked). Re-run in CI or Linux for a definitive lint pass.

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
- **Resolved:** SEO commit `0ac3646` is live on VPS (see §10). No deploy blockers observed in smoke tests.
- **Follow-up (optional):** ~~clean up nginx duplicate MIME warning~~ (fixed in repo §17, VPS reload pending); confirm `sitemap-salons.xml` URL counts in GSC after salon API has public data.

---

## 17. Final SEO quality audit (2026-11-25)

**Production buildId (unchanged during this audit):** `0ac3646`  
**Audit method:** production `curl.exe`, registry source (`LANDING_COPY`), Vitest `src/seo/seo.test.ts`, `npm run lint:seo`, local git status (no VPS deploy for this pass).

### 17.1 ESLint — root cause & fix

| Symptom | Root cause | Evidence | Fix (repo) |
|--------|------------|----------|------------|
| `npm run lint` on Windows ran 6+ minutes / appeared hung | `eslint .` crawled **untracked** `apps/user/android/` (Expo/RN tree) plus entire repo | Background run stalled at `eslint .` with only prompt line for 160s+; `git status` shows untracked `apps/user/android/` | `eslint.config.js` ignores: `android`, `test-results`, `eslint-out.txt`; `.prettierignore` updated |
| Lint still exits non-zero after scope fix | **948× `prettier/prettier`** across legacy `src/` (pre-existing; **not** SEO modules) | `eslint src` → `✖ 1005 problems (948 errors, 57 warnings)`; `943` lines are `prettier/prettier` | SEO gate: `npm run lint:seo` → **exit 0** in ~4s |
| SEO code clean | No ESLint issues under `src/seo/**` | `npx eslint src/seo/**` exit 0 | `package.json` scripts: `"lint": "eslint src e2e"`, `"lint:seo": "..."` |

**Conclusion:** Deploy was never blocked by SEO lint quality; the operational blocker was **lint scope** (`eslint .` + `android/`). Use `lint:seo` in SEO/CI checks until a repo-wide Prettier pass is scheduled.

### 17.2 Nginx warnings — safe remediation (repo only; VPS not redeployed in this audit)

| Warning | Cause | Fix |
|--------|-------|-----|
| `duplicate MIME type "text/html"` in `mysaloon-user.conf:44` | `gzip_types` listed `text/html` while Nginx already treats HTML as gzip-eligible by default | Removed `text/html` from `gzip_types` |
| `protocol options redefined` in `mysaloon-barber.conf:17` | Second `listen … http2` on shared `:443` after other vhosts | Partner vhost: `listen 443 ssl` **without** `http2` (HTTP/2 remains on apex `mysaloon-user.conf`) |

**Apply on VPS:** copy updated conf files, then `nginx -t && systemctl reload nginx` (no user dist rebuild required).

### 17.3 Local undeployed / untracked changes

`git status` on `main` (synced with `origin/main`, deployed SHA `0ed2825f` / includes Prettier SEO fix):

| Path | Type | Action taken |
|------|------|--------------|
| `apps/user/android/` | Untracked local RN artifacts | **Not** added, deleted, or deployed |
| `apps/user/test-results/` | Playwright output | **Not** committed |
| `apps/user/eslint-out.txt` | Empty local scratch | **Not** committed |
| `backend/test_db.sqlite3` | Local test DB | **Not** committed |
| This audit (`eslint.config.js`, nginx, `lint:seo`, §17 doc) | Tracked edits | Committed separately; **no** auto-deploy to VPS |

### 17.4 Sitemap URL counts (production live)

Command: count `<loc>` per child sitemap on `https://mysaloon.uz` (2026-11-25 ~14:00 UTC+5).

| Sitemap | URLs | Notes |
|---------|------|-------|
| `sitemap-static.xml` | **16** | Matches build-time `staticSitemapUrls()` (11 marketing/locale + 5 extras: `/ai-style`, `/ai-style/chat`, `/today`, `/top`, `/compare`) |
| `sitemap-morf.xml` | **21** | 7 Morf landings × 3 locales |
| `sitemap-salons.xml` | **0** | Empty `<urlset>` — API `GET /api/v1/salons/` → `{"count":0,"results":[]}` (quality gate needs name + cover or description) |
| `sitemap-styles.xml` | **62** | Hairstyles passing image + (description or tags) gate |
| `sitemap-barbers.xml` | **0** | Empty — likely no public barbers passing avatar + display_name gate |
| **Total indexable URLs** | **99** | Sum of children (index lists 5 children, no URLs in index itself) |

Registry-only expectation for static+morf: **16 + 21 = 37** marketing URLs; production **99** = marketing + **62** explore style detail pages.

### 17.5 Public registry pages — UZ / RU / EN metadata

Source of truth: `apps/user/src/seo/content/landings.ts`. Canonical = `https://mysaloon.uz` + `localizedLandingPath()`.

**Tri-lingual cluster (dedicated `/ru/*`, `/en/*` routes + hreflang):**

| Path (UZ) | Locale | Title | Meta description (len) | H1 | Canonical |
|-----------|--------|-------|------------------------|-----|-----------|
| `/` | uz | mysaloon.uz — Sartaroshxona va salonlarni onlayn band qiling (60) | O'zbekistondagi sartaroshlar… (129) | Salon va sartaroshxonalarni onlayn band qiling | `https://mysaloon.uz/` |
| `/` | ru | mysaloon.uz — Онлайн-запись в барбершопы и салоны (49) | Найдите барбершопы… (115) | Онлайн-запись в салоны и барбершопы | `https://mysaloon.uz/ru` |
| `/` | en | mysaloon.uz — Book barbershops and salons online (48) | Discover barbers… (109) | Book salons and barbershops online | `https://mysaloon.uz/en` |
| `/morf-ai` | uz | Morf AI — Soch uslubini selfie bilan sinab ko'ring \| mysaloon.uz **(64)** | Morf AI ekotizimi… (104) | Morf AI — sochingiz uchun aqlli yordamchi | `https://mysaloon.uz/morf-ai` |
| `/morf-ai` | ru | Morf AI — Примерьте причёску по селфи \| mysaloon.uz (51) | Экосистема Morf AI… (86) | Morf AI — умный помощник для волос | `https://mysaloon.uz/ru/morf-ai` |
| `/morf-ai` | en | Morf AI — Try hairstyles on your selfie \| mysaloon.uz (53) | The Morf AI ecosystem… (101) | Morf AI — smart guidance for your hair | `https://mysaloon.uz/en/morf-ai` |
| `/morf-ai/try-on` | uz | Virtual try-on — selfie bilan soch uslubi \| Morf AI (51) | Bir selfie yuklang… (87) | Selfie bilan soch uslubini sinab ko'ring | `https://mysaloon.uz/morf-ai/try-on` |
| `/morf-ai/try-on` | ru | Виртуальный try-on по селфи \| Morf AI (37) | Загрузите селфи… (75) | Примерьте причёску на селфи | `https://mysaloon.uz/ru/morf-ai/try-on` |
| `/morf-ai/try-on` | en | Virtual try-on on your selfie \| Morf AI (39) | Upload a selfie… (82) | Try a hairstyle on your selfie | `https://mysaloon.uz/en/morf-ai/try-on` |
| `/morf-ai/hairstyles` | uz | Soch uslublari katalogi — erkak va ayol \| Morf AI (49) | Trend uslublar… (73) | Soch uslublari katalogi | `https://mysaloon.uz/morf-ai/hairstyles` |
| `/morf-ai/hairstyles` | ru | Каталог причёсок — мужские и женские \| Morf AI (46) | Трендовые стили… (48) | Каталог причёсок | `https://mysaloon.uz/ru/morf-ai/hairstyles` |
| `/morf-ai/hairstyles` | en | Hairstyle catalog — men's and women's \| Morf AI (47) | Trending cuts… (60) | Hairstyle catalog | `https://mysaloon.uz/en/morf-ai/hairstyles` |
| `/morf-ai/hair-care` | uz | Soch parvarishi markazi — reja va maslahat \| Morf AI (52) | Shaxsiy parvarish… (57) | Soch parvarishi markazi | `https://mysaloon.uz/morf-ai/hair-care` |
| `/morf-ai/hair-care` | ru | Центр ухода за волосами \| Morf AI (33) | Персональный план… (46) | Центр ухода за волосами | `https://mysaloon.uz/ru/morf-ai/hair-care` |
| `/morf-ai/hair-care` | en | Hair care hub — routines and advice \| Morf AI (45) | Personal care plan… (46) | Hair care hub | `https://mysaloon.uz/en/morf-ai/hair-care` |
| `/morf-ai/ingredient-scanner` | uz | Shampun tarkibi skaneri — Hair Advisor \| Morf AI (48) | Mahsulot yorlig'ini… (85) | Ingredient skaneri | `https://mysaloon.uz/morf-ai/ingredient-scanner` |
| `/morf-ai/ingredient-scanner` | ru | Сканер состава шампуня \| Morf AI (32) | Сканируйте этикетку… (59) | Сканер состава | `https://mysaloon.uz/ru/morf-ai/ingredient-scanner` |
| `/morf-ai/ingredient-scanner` | en | Shampoo ingredient scanner \| Morf AI (36) | Scan the label… (68) | Ingredient scanner | `https://mysaloon.uz/en/morf-ai/ingredient-scanner` |
| `/morf-ai/chat` | uz | Morf AI chat — soch bo'yicha maslahat (37) | AI bilan suhbat… (58) | AI maslahatchi chat | `https://mysaloon.uz/morf-ai/chat` |
| `/morf-ai/chat` | ru | Чат Morf AI — советы по волосам (31) | Диалог с AI… (49) | AI-консультант в чате | `https://mysaloon.uz/ru/morf-ai/chat` |
| `/morf-ai/chat` | en | Morf AI chat — hair advice (26) | Talk with AI… (53) | AI advisor chat | `https://mysaloon.uz/en/morf-ai/chat` |
| `/morf-ai/weather-care` | uz | Ob-havo bo'yicha soch parvarishi \| Morf AI (42) | Bugungi ob-havoga… (87) | Ob-havo parvarishi | `https://mysaloon.uz/morf-ai/weather-care` |
| `/morf-ai/weather-care` | ru | Уход с учётом погоды \| Morf AI (30) | Советы по уходу… (39) | Уход с учётом погоды | `https://mysaloon.uz/ru/morf-ai/weather-care` |
| `/morf-ai/weather-care` | en | Weather-aware hair care \| Morf AI (33) | Daily care tips… (45) | Weather-aware care | `https://mysaloon.uz/en/morf-ai/weather-care` |
| `/booking` | uz | Salon bron qilish — bo'sh vaqtlar va onlayn to'lov (50) | Yaqin salonni… (62) | Salonni onlayn band qiling | `https://mysaloon.uz/booking` |
| `/booking` | ru | Запись в салон — свободное время и оплата (41) | Выберите салон… (53) | Забронируйте салон онлайн | `https://mysaloon.uz/ru/booking` |
| `/booking` | en | Book a salon — live availability (32) | Pick a salon… (56) | Book your salon online | `https://mysaloon.uz/en/booking` |

**UZ-primary pages (sitemap lists UZ URL only; copy includes RU/EN in registry for UI/i18n, hreflang not emitted):**

| Path | uz Title | uz Description | uz H1 | Canonical |
|------|----------|----------------|-------|-----------|
| `/for-salons` | Salon egalari uchun — MySaloon Partner | Onlayn bron, mijozlar… | Saloningiz uchun MySaloon | `https://mysaloon.uz/for-salons` |
| `/map` | Salon xaritasi — yaqin sartaroshxonalarni toping | Joylashuv bo'yicha salonlar… | Salon xaritasi | `https://mysaloon.uz/map` |
| `/explore` | Soch uslublari — katalog va try-on | Erkak va ayol uslublari… | Soch uslublari katalogi | `https://mysaloon.uz/explore` |
| `/privacy-policy` | Maxfiylik siyosati — mysaloon.uz | MySaloon va Morf AI… | Maxfiylik siyosati | `https://mysaloon.uz/privacy-policy` |
| `/terms-of-use` | Foydalanish shartlari — mysaloon.uz | Platformadan foydalanish… | Foydalanish shartlari | `https://mysaloon.uz/terms-of-use` |

**Sitemap extras (product URLs, UZ only in static sitemap):** `/ai-style`, `/ai-style/chat`, `/today`, `/top`, `/compare`.

**Production HTML spot-check** (`/morf-ai`): title, canonical, hreflang `uz|ru|en|x-default`, JSON-LD `Organization`, `WebSite`, `Service`, `FAQPage`, `SoftwareApplication`, `BreadcrumbList` — verified in raw HTML (§10 sample extended 2026-11-25).

### 17.6 Title / description quality

| Check | Result |
|-------|--------|
| Duplicate titles across registry | **None** (`duplicateTitles: []`) |
| Title length | **1** title slightly over ~60 chars: UZ `morf-ai-hub` (64). Others ≤60 or acceptable EN/RU commercial length |
| Meta description length | All **≤160** chars in registry |
| Search intent | Home/booking → transactional booking; Morf cluster → informational + tool CTAs to `/ai-style` / `/explore`; legal → compliance |
| H1 vs title | Distinct on all landings (no duplicate title=H1) |

### 17.7 Cloaking check (user vs Googlebot)

**Method:** fetch same path with `Mozilla/5.0` vs `Googlebot`; compare `<title>`, canonical, `#seo-prerender` H1.

| URL | SEO payload | Diff? |
|-----|-------------|-------|
| `/`, `/morf-ai`, `/ru/morf-ai` | Identical title, canonical, H1, prerender nav | **No cloaking** — only TanStack router cache id in streamed script differs (`u:` timestamp) |
| `/wallet` | Both lack registry title; wallet shell | **MATCH** (private route) |

Injection path (`injectSeoIntoHtml`) does **not** branch on `User-Agent` — evidence: `seo-html-inject.server.ts` has no UA logic.

### 17.8 hreflang, JSON-LD, noindex, canonical, HTTP

| Check | Expected | Production evidence |
|-------|----------|---------------------|
| Canonical apex | `https://mysaloon.uz/...` | `curl` sample §10; `/morf-ai` → `https://mysaloon.uz/morf-ai` |
| hreflang | 4 links on trilingual Morf/home/booking | `/morf-ai` HTML lines with `hreflang="uz|ru|en|x-default"` |
| JSON-LD | Morf landings: Service + SoftwareApplication + FAQ when defined | `/morf-ai` includes 6 LD blocks |
| noindex private | `/wallet` | `<meta name="robots" content="noindex, nofollow" />` on `https://mysaloon.uz/wallet` |
| www redirect | 301 → apex | `curl -w "%{http_code} %{redirect_url}" https://www.mysaloon.uz/` → **301** `https://mysaloon.uz/` |
| robots/sitemap | 200 | robots **200**, sitemap index **200** |

### 17.9 AI services ↔ SEO integration

| User-facing AI feature | SEO marketing route | Product route (CTA / app) | In sitemap |
|------------------------|----------------------|---------------------------|------------|
| Virtual try-on | `/morf-ai`, `/morf-ai/try-on` | `/ai-style` | morf + `/ai-style` static |
| Hairstyle catalog | `/morf-ai/hairstyles` | `/explore` | morf + styles dynamic |
| Hair care hub | `/morf-ai/hair-care`, `/morf-ai/weather-care` | `/ai-style/care` | morf (care path not separate URL) |
| Ingredient scanner / Hair Advisor 2 | `/morf-ai/ingredient-scanner` | `/ai-style/care/ingredient` | morf; scan result paths **noindex** (`/ai-style/care/ingredient/`) |
| AI chat | `/morf-ai/chat` | `/ai-style/chat` | morf + `/ai-style/chat` static |
| Share / look viral | — | `/morf-ai/share/*`, `/morf-ai/look/*` | Dynamic when shared (injection in `seo-html-inject.server.ts`) |
| Studio (disabled) | Not in copy | `/ai-style/studio` **noindex** | Excluded |

All Morf marketing landings are wired in `LANDING_PAGES`, HTML injection, and `sitemap-morf.xml`.

### 17.10 Audit verdict

| Area | Status |
|------|--------|
| Production SEO deploy (`0ac3646`) | **Healthy** — smoke tests hold |
| ESLint for SEO modules | **Pass** (`lint:seo`) |
| Nginx warnings | **Mitigated in repo** — VPS reload pending |
| Sitemap totals | **99** URLs live; salons/barbers empty due to **empty/zero API data**, not handler failure |
| Cloaking | **Not detected** |
| Local junk / undeployed trees | **Documented** — left untouched |

**Recommended follow-ups (non-blocking):** when salon/barber API populates, re-verify dynamic sitemaps; optional trim UZ Morf hub title by 4 chars for SERP; submit `sitemap.xml` in GSC (§11).

---

## 18. Production closure audit (2026-11-25 ~14:15 UTC+5)

### 18.1 Deploy

| Field | Value |
|--------|--------|
| **Git commit (production)** | `a4eb7e453e6ba3d06256a830a31232df1bf1d848` |
| **buildId** | `a4eb7e4` (`builtAt`: `2026-11-25T09:09:32.090Z`) |
| **VPS command** | `git pull --ff-only` + `sudo bash deploy/vps/deploy-frontends.sh auto` |
| **Rebuild scope** | `user=1` (eslint/lint script + nginx in repo), `admin=0`, `barber=0` |
| **Services** | `mysaloon-user` **active**, `nginx` **active** |
| **Nginx post-pass** | www vhost: `listen 443 ssl` only (301 to apex); apex keeps `http2`; `gzip_types` without duplicate `text/html`; **`nginx -t` OK**, reload OK |
| **Nginx warnings remaining** | Non-fatal `protocol options redefined` on apex block when multiple vhosts share `:443` (nginx \< 1.25, `http2 on;` unsupported on this host) |

Backups before deploy: `mysaloon-user.conf` / `mysaloon-barber.conf` under `/var/backups/mysaloon/` (pre-a4eb7e45).

### 18.2 Salon & barber sitemap — root cause (read-only DB, no data changes)

**Production DB snapshot** (`manage.py shell` on VPS, 2026-11-25):

| Metric | Count | Meaning |
|--------|-------|---------|
| `salon_total` | **3** | Rows exist in DB |
| `salon_is_published` | **3** | `is_published=True` |
| `salon_customer_visible` | **0** | Fails `filter_customer_visible_salons()` |
| `salon_subscription_active` | **0** | No active paid subscription |
| `salon_subscription_trial` | **3** | All marked trial |
| `salon_passing_sitemap_gate` | **0** | Empty public list → nothing to evaluate |

**Per-salon (customer catalog / API list):**

| id | name | published | sub | trial_ends | customer_visible |
|----|------|-----------|-----|------------|------------------|
| 361 | Make me Beautiful | yes | trial | **2026-08-16** (expired) | **no** |
| 362 | Maxtob Go'zallik saloni | yes | trial | **2026-08-16** (expired) | **no** |
| 380 | Jalolbek Barber | yes | trial | **2026-08-16** (expired) | **no** |

**Code path:** `SalonViewSet._salon_public_list_qs()` → `filter_customer_visible_salons()` requires `is_published` **and** (`subscription_status=ACTIVE` **or** unexpired trial **or** owner shop subscription). See `backend/salons/visibility.py`.

**Sitemap second gate** (`fetchSalonSitemapUrls`): same API list; each row needs `name` + (`cover_image` **or** `description`). Even visible salons would still skip without cover/description.

**Barbers (`barber_total` 10, `barber_publicly_visible` 0):**

| Layer | Rule |
|-------|------|
| API list | `BarberPublicViewSet` → `barber_id__in publicly_visible_barber_ids()` |
| Visibility | `barber_is_publicly_visible` = `fully_ready` **and** `barber_has_customer_entitlement` |
| Sample | Barbers **442, 443, 445**: `fully_ready=True`, **`entitlement=False`** (no active shop/customer subscription) |

**Sitemap gate:** `display_name` + `avatar` required (`fetchBarberSitemapUrls`).

**Conclusion:** `sitemap-salons.xml` / `sitemap-barbers.xml` are empty because **no row passes production business rules**, not because of a Nitro bug. **No auto-publish or moderation bypass was applied.**

### 18.3 Sitemap URL verification (n=99)

Automated fetch of every `<loc>` in child sitemaps (2026-11-25):

| Result | Count |
|--------|-------|
| HTTP **200** | **99 / 99** |
| Registry landings (canonical + title + description + H1 + hreflang where trilingual) | **37 / 37** pass |
| `/explore/{slug}` dynamic styles | **62 / 62** pass (canonical + dynamic title/description/H1 via injection) |
| **Issues (5 URLs)** | `/ai-style`, `/ai-style/chat`, `/today`, `/top`, `/compare` — **200** but **no server-side canonical** (not in SEO registry; default app shell title). Still indexable; follow-up: optional registry entries. |

### 18.4 ESLint — Prettier vs functional

`eslint src e2e` (Windows, 2026-11-25):

| Rule | Count | Category |
|------|-------|----------|
| `prettier/prettier` | **937** | Formatting debt (CRLF/line wraps) |
| `react-refresh/only-export-components` | 43 | Warning-level |
| `react-hooks/exhaustive-deps` | 14 | Hooks hygiene |
| `no-empty` | 3 | Minor |
| `prefer-const` | 2 | Minor |

**`npm run lint:seo`** → **exit 0**. **`npm run build`** (user) → **exit 0**, buildId `a4eb7e4`.

### 18.5 Public SEO copy — UZ / RU / EN (title + description)

**Tri-lingual pages**

| Page | UZ title | UZ description |
|------|----------|----------------|
| home | mysaloon.uz — Sartaroshxona va salonlarni onlayn band qiling | O'zbekistondagi sartaroshlar va go'zallik salonlarini xaritada toping, bo'sh vaqtlarni ko'ring va bir necha bosishda bron qiling. |
| home | **RU:** mysaloon.uz — Онлайн-запись в барбершопы и салоны | Найдите барбершопы и салоны красоты в Узбекистане на карте, выберите свободное время и забронируйте за пару кликов. |
| home | **EN:** mysaloon.uz — Book barbershops and salons online | Discover barbers and beauty salons in Uzbekistan on the map, check real availability, and book in a few taps. |
| morf-ai hub | Morf AI — Soch uslubini selfie bilan sinab ko'ring \| mysaloon.uz | Morf AI ekotizimi: virtual try-on, AI chat, parvarish markazi, ingredient skaneri va haqiqiy salon bron. |
| morf-ai hub | **RU:** Morf AI — Примерьте причёску по селфи \| mysaloon.uz | Экосистема Morf AI: виртуальный try-on, AI-чат, уход, сканер состава и запись в салон. |
| morf-ai hub | **EN:** Morf AI — Try hairstyles on your selfie \| mysaloon.uz | The Morf AI ecosystem: virtual try-on, AI chat, hair care hub, ingredient scanner, and salon booking. |
| try-on | Virtual try-on — selfie bilan soch uslubi \| Morf AI | Bir selfie yuklang, minglab tayyor uslublardan tanlang va natijani soniyalarda ko'ring. |
| try-on | **RU:** Виртуальный try-on по селфи \| Morf AI | Загрузите селфи, выберите стиль из каталога и увидите результат за секунды. |
| try-on | **EN:** Virtual try-on on your selfie \| Morf AI | Upload a selfie, pick a style from the catalog, and preview the result in seconds. |
| hairstyles | Soch uslublari katalogi — erkak va ayol \| Morf AI | Trend uslublar, persona suratlari va har bir uslub uchun try-on havolasi. |
| hairstyles | **RU:** Каталог причёсок — мужские и женские \| Morf AI | Трендовые стили с примерами и ссылкой на try-on. |
| hairstyles | **EN:** Hairstyle catalog — men's and women's \| Morf AI | Trending cuts with previews and a link to try each style on. |
| hair-care | Soch parvarishi markazi — reja va maslahat \| Morf AI | Shaxsiy parvarish rejasi, mahsulotlar va AI maslahatlari. |
| hair-care | **RU:** Центр ухода за волосами \| Morf AI | Персональный план ухода, продукты и AI-советы. |
| hair-care | **EN:** Hair care hub — routines and advice \| Morf AI | Personal care plan, products, and AI guidance. |
| ingredient | Shampun tarkibi skaneri — Hair Advisor \| Morf AI | Mahsulot yorlig'ini skaner qiling, ingredientlarni tushuning va mosligini tekshiring. |
| ingredient | **RU:** Сканер состава шампуня \| Morf AI | Сканируйте этикетку и проверьте совместимость ингредиентов. |
| ingredient | **EN:** Shampoo ingredient scanner \| Morf AI | Scan the label, understand ingredients, and check fit for your hair. |
| chat | Morf AI chat — soch bo'yicha maslahat | AI bilan suhbat: uslub, parvarish va salonga tayyorgarlik. |
| chat | **RU:** Чат Morf AI — советы по волосам | Диалог с AI о стиле, уходе и подготовке к визиту. |
| chat | **EN:** Morf AI chat — hair advice | Talk with AI about style, care, and your salon visit. |
| weather | Ob-havo bo'yicha soch parvarishi \| Morf AI | Bugungi ob-havoga mos parvarish tavsiyalari — namlik, shamol va quyosh hisobga olinadi. |
| weather | **RU:** Уход с учётом погоды \| Morf AI | Советы по уходу под сегодняшнюю погоду. |
| weather | **EN:** Weather-aware hair care \| Morf AI | Daily care tips aligned with today's weather. |
| booking | Salon bron qilish — bo'sh vaqtlar va onlayn to'lov | Yaqin salonni tanlang, xizmat va ustani belgilang, tasdiqlang. |
| booking | **RU:** Запись в салон — свободное время и оплата | Выберите салон, услугу и мастера, подтвердите запись. |
| booking | **EN:** Book a salon — live availability | Pick a salon, service, and stylist, then confirm online. |

**UZ-primary (registry copy; RU/EN strings exist for UI but no separate index URLs)**

| Page | UZ title | UZ description |
|------|----------|----------------|
| for-salons | Salon egalari uchun — MySaloon Partner | Onlayn bron, mijozlar va TOP ko'rinish. Bepul boshlash. |
| map | Salon xaritasi — yaqin sartaroshxonalarni toping | Joylashuv bo'yicha salonlar, reyting va bo'sh vaqtlar. |
| explore | Soch uslublari — katalog va try-on | Erkak va ayol uslublari, persona suratlari. |
| privacy | Maxfiylik siyosati — mysaloon.uz | MySaloon va Morf AI ma'lumotlaringizni qanday himoya qiladi. |
| terms | Foydalanish shartlari — mysaloon.uz | Platformadan foydalanish qoidalari. |

Full UZ/RU/EN matrix: `apps/user/src/seo/content/landings.ts` (also §17.5).

### 18.6 Post-deploy smoke (HTTP only, no payments / no paid AI)

| Check | Result |
|-------|--------|
| `/`, `/booking`, Morf landings, `/ai-style`, `/ai-style/chat`, `/ai-style/care`, `/ai-style/care/ingredient` | **200** |
| `/auth` (login entry) | **200** |
| `/map` | **307** → `/map?q=&category=all` (app redirect, expected) |
| `/explore` | **200** |
| `api.mysaloon.uz/health/` | **200** |
| `/api/v1/site/config/` | **200** (OAuth client id present) |
| `/wallet` | **200** + `noindex` (unchanged) |

No checkout, Payme, or try-on **generate** endpoints were called.

### 18.7 Final status

| Item | Status |
|------|--------|
| Commit `a4eb7e45` on VPS | **Live** |
| Sitemap URLs (production) | **99** |
| Nginx | **syntax OK**, reloaded; gzip MIME + barber http2 warnings addressed; minor apex `http2` redefine warning may remain |
| Salon/barber sitemaps | **0** — expired trials + missing barber entitlement (documented) |
| SEO lint / build | **Pass** |
| User data | **Unchanged** |