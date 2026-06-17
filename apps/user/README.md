# User app (mijoz ilovasi)

Mijoz ilovasi — barcha UI kodi shu papkada (`src/`).

## Ishga tushirish

```bash
# loyiha ildizidan
npm install
npm run dev:user
```

http://localhost:3000

Lokal dev: `VITE_API_URL` odatda kerak emas — Vite `/api/v1` ni `127.0.0.1:8000` ga proxy qiladi.

## Vercel deploy (MUHIM)

TanStack Start + Nitro **Build Output API** ishlatadi. Build `.vercel/output` yaratadi.

| Sozlama | To'g'ri qiymat | Noto'g'ri |
|---------|----------------|-----------|
| **Root Directory** | `apps/user` | `dist` ❌ |
| **Output Directory** | **bo'sh** (Override o'chirilgan) | `dist` ❌ |
| **Framework Preset** | Other | Vite ❌ |
| **Build Command** | `npm run build` | |
| **Install Command** | `cd ../.. && npm install` | |

Batafsil: yuqoridagi jadval va `scripts/prepare-vercel-output.mjs`.

### Oq ekran (MIME / main.tsx xatosi)

Agar brauzer `Failed to load module script … main.tsx` yoki `main.jsx` ko'rsatsa:

1. **Root Directory** `apps/user` bo'lishi kerak (repo ildizi emas).
2. **Output Directory** bo'sh — `dist` yoki `dist/static` qo'ymang (Build Output API ishlatiladi).
3. **Framework Preset** — **Other**, Vite emas.
4. Dashboard'dagi **SPA rewrites** (`/(.*) → /index.html`) o'chirilgan bo'lishi kerak — ular `/assets/*.js` ni ham HTML qaytaradi.
5. `apps/user/index.html` bo'lmasligi kerak — faqat `mobile/index.html` (Capacitor). Dev HTML Vercel'da SSR o'rniga statik fayl sifatida chiqadi.

Qayta deploy: `npm run build` (`.vercel/output` yaratiladi) → Vercel redeploy.

## Env

| O'zgaruvchi | Qiymat |
|-------------|--------|
| `VITE_API_URL` | `https://api.mysaloon.uz` (production / Capacitor) |
| `VITE_DGIS_API_KEY` | 2GIS MapGL (xarita) — [2GIS Console](https://platform.2gis.com/) |
| `NEXT_PUBLIC_BARBER_WEB_ORIGIN` | `https://partner.mysaloon.uz` (ixtiyoriy) |

To'liq ro'yxat: `.env.example`

## Ma'lumot manbalari

- **REST API:** `src/lib/api/` — asosiy integratsiya (`API_STATUS_MATRIX.md`)
- **Mock/demo:** offers, loyalty, reels va boshqalar hali `mock-data.ts` da
- **WebSocket:** chat va bildirishnomalar (productionda `REDIS_URL` kerak)

## Android (Capacitor)

```bash
npm run cap:android          # ildizdan
npm run cap:open -w user-web
```

App ID: `uz.mysaloon.app` — batafsil: `apps/MOBILE_PRODUCTION.md`
