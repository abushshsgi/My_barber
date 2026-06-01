# User app (mijoz ilovasi)

Mijoz ilovasi — barcha UI kodi shu papkada (`src/`).  
Manba: [salon-connect](https://github.com/abushshsgi/salon-connect) (yangilash: repodan `src/` ni sync qiling).

## Ishga tushirish

```bash
# loyiha ildizidan
npm install
npm run dev:user
```

http://localhost:3000

## Vercel deploy (MUHIM)

TanStack Start + Nitro **Build Output API** ishlatadi. Build `.vercel/output` yaratadi.

| Sozlama              | To‘g‘ri qiymat                   | Noto‘g‘ri |
| -------------------- | -------------------------------- | --------- |
| **Root Directory**   | `apps/user`                      | `dist` ❌ |
| **Output Directory** | **bo‘sh** (Override o‘chirilgan) | `dist` ❌ |
| **Framework Preset** | Other                            | Vite ❌   |
| **Build Command**    | `npm run build`                  |           |
| **Install Command**  | `cd ../.. && npm install`        |           |

### Nima uchun stilsiz sahifa chiqadi?

Agar Output Directory = `dist` qo‘ysangiz, Vercel faqat **server function** (HTML) deploy qiladi, **CSS/JS static fayllar CDN ga chiqmaydi** → barcha `/assets/*` **404**.

Belgilar:

- Oq fon, stilsiz matn
- `nav.home`, `nav.map` (JS yuklanmagan)
- Console: `/assets/*.css` va `/assets/*.js` → 404

### Deploy qadamlari

1. Vercel → Settings → General → **Root Directory** = `apps/user`
2. Settings → Build → **Output Directory override ni O‘CHIRING** (maydon bo‘sh!)
3. Redeploy
4. Tekshiruv: `https://YOUR-DOMAIN/assets/styles-D-UzSqGe.css` → **200**

`vercel.json` da `outputDirectory` **bo‘lmasligi** kerak — build `.vercel/output` ni avtomatik ishlatadi.

## Env (Vercel)

| O‘zgaruvchi    | Qiymat                    |
| -------------- | ------------------------- |
| `VITE_API_URL` | `https://api.mysaloon.uz` |

## Ma'lumot

Hozir: `src/lib/mock-data.ts`. Backend API — `API_STATUS_MATRIX.md`.
