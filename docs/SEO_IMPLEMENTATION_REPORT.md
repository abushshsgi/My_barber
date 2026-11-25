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

**Recommended follow-ups (non-blocking):** VPS nginx reload; when salon/barber API populates, re-verify dynamic sitemaps; optional trim UZ Morf hub title by 4 chars for SERP; submit `sitemap.xml` in GSC (§11).