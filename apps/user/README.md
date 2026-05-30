# User app (mijoz ilovasi)

Mijoz ilovasi — barcha UI kodi shu papkada (`src/`).

## Ishga tushirish

```bash
# loyiha ildizidan
npm install
npm run dev:user
```

http://localhost:3000

## Vercel deploy (MUHIM)

TanStack Start + Nitro **oddiy static `dist` emas**. Build `.vercel/output` yaratadi.

| Sozlama | To‘g‘ri qiymat | Noto‘g‘ri |
|---------|----------------|-----------|
| **Root Directory** | `apps/user` | `dist` ❌ |
| **Output Directory** | **`dist`** | `dist/client` ❌ |
| **Framework Preset** | Other | Vite ❌ |
| **Build Command** | `npm run build` | |
| **Install Command** | `cd ../.. && npm install` | |

### Belgilar (Output Directory noto‘g‘ri bo‘lsa)

- Sahifa oq fon, stilsiz
- `nav.home`, `nav.map` kabi kalitlar ko‘rinadi (JS yuklanmagan)
- Console: barcha `/assets/*.css` va `/assets/*.js` → **404**

### Deploy qadamlari

1. Vercel → Project → Settings → General → Root Directory = `apps/user`
2. Settings → Build → Output Directory = **`dist`** ( **`dist/client` emas** )
3. Redeploy
4. Tekshiruv: `https://YOUR-DOMAIN/assets/` — CSS fayl **200** qaytarishi kerak

`vercel.json` ichida `outputDirectory: "dist"` — Build Output API (`config.json` + `static/` + `functions/`).

## Env (Vercel)

| O‘zgaruvchi | Qiymat |
|-------------|--------|
| `VITE_API_URL` | `https://api.mysaloon.uz` |

## Ma'lumot

Hozir: `src/lib/mock-data.ts`. Backend API — `API_STATUS_MATRIX.md`.
