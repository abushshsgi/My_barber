# MySaloon & Morf AI — Image SEO, Catalog SEO, Content SEO

**Sana:** 2026-11-25  
**Katalog manbai:** `GET https://api.mysaloon.uz/api/v1/hairstyles/`

## 1. Katalog aniqlash

| Ko‘rsatkich | Qiymat |
|-------------|--------|
| Jami public `Hairstyle` (API) | **62** |
| Erkak (`men`) | 50 |
| Ayol (`women`) | 12 |
| Uzunlik: short / medium / long | 23 / 33 / 6 |
| Sitemap sifat darvozasi (rasm + tavsif/yorliq) | **62** (oldingi `sitemap-styles.xml` bilan mos) |

Try-On integratsiyasi, `style_id`, `slug`, `image_path` va reference rasmlar **o‘zgartirilmagan**.

## 2. Image SEO

- Modul: `apps/user/src/seo/hairstyles/image-seo.ts`
- Har model uchun: filename, UZ/RU/EN ALT, caption, meta, ImageObject (JSON-LD), OG image 768×1024
- `textured-crop`, `low-fade`, `french-crop` va boshqalar uchun **alohida** override matnlar
- Qolgan 62 model — audience + length + tags asosida **noyob** shablon
- UI: `ExploreStyleGallery` — `primaryAlt`, `width`/`height`, `loading`/`fetchPriority`

## 3. Google Images indekslash

- Statik katalog: `https://mysaloon.uz/hairstyles/**` — nginx `Cache-Control: public, max-age=31536000`
- `img` — HTML `src`, lazy/eager, o‘lchamlar
- Private media (selfie, try-on generatsiya, share) — avvalgidek noindex / guest emas

## 4. Sitemap

| Fayl | Vazifa |
|------|--------|
| `sitemap-styles.xml` | Explore URL + **image:image** extension |
| `sitemap-images.xml` | Alohida image sitemap (xuddi katalog rasmlari) |
| `sitemap-categories.xml` | Faqat yetarli kontentli kategoriyalar |
| `sitemap-blog.xml` | Nashr qilingan `guides` maqolalari |
| `sitemap-static.xml` | `/guides` qo‘shildi |

Index: 8 ta child sitemap (oldingi 5 + images, categories, blog).

## 5. Model landing (`/explore/{id}`)

- Server inject: title, description, canonical, OG, ImageObject, BreadcrumbList, try-on CTA
- Analitika: `hairstyle_model_view`, `tryon_cta_click`

## 6. Kategoriya sahifalari

`/explore/category/{id}` — 9 ta mantiqiy kategoriya; sitemapga faqat ≥3 modeli borlar kiritiladi.

## 7. Blog / Guides

- Backend: `content_seo.SeoArticle` + Django admin + `GET /api/v1/content/articles/`
- User: `/guides`, `/guides/{slug}`
- **18 ta draft** (`0002_seed_seo_article_drafts`) — avtomatik publish **yo‘q**

## 8. Keyword clusters

- `apps/user/src/seo/keyword-clusters.ts`
- `scripts/export-keyword-clusters.mjs` → `docs/seo-keyword-clusters.csv`

## 9. Organik konversiya eventlari

Yangi client eventlar: `organic_landing_view`, `hairstyle_model_view`, `tryon_cta_click`, `blog_article_view`, `scan_cta_click`, `generation_completed` (+ Google Images referrer aniqlash).

## 10. Test

- `npm run lint:seo` — OK
- Vitest SEO + image-seo — OK
- `npm run build` (user-web) — OK

## 11. GSC tekshirish

- `https://mysaloon.uz/sitemap.xml`
- Namuna: `https://mysaloon.uz/explore/men-textured-crop`
- Namuna rasm: `https://mysaloon.uz/hairstyles/men/textured-crop.webp`
- Kategoriya: `https://mysaloon.uz/explore/category/mens-haircuts`

## 12. Qolgan ishlar

- Maqola draftlarini admin tasdiqlab `published` + `published_at` berish
- Keyword hajmlarini GSC/Keyword Planner bilan almashtirish
- Backend migratsiya Railway release da (`content_seo`)