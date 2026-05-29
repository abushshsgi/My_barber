# User app (mijoz ilovasi)

Mijoz ilovasi — barcha UI kodi shu papkada (`src/`).

## Ishga tushirish

```bash
# loyiha ildizidan
npm install
npm run dev:user
```

http://localhost:3000

## Vercel

| Sozlama | Qiymat |
|---------|--------|
| Root Directory | `apps/user` |
| Output Directory | **bo‘sh / Override o‘chirilgan** (`.vercel/output` avtomatik) |
| Build Command | `npm run build` |
| Install Command | `cd ../.. && npm install` |

**Muhim:** Dashboardda Output Directory **`dist` yoki `dist/client` qo‘ymang** — build `.vercel/output` yaratadi.

## Ma'lumot

Hozir: `src/lib/mock-data.ts`. Backend API — `API_STATUS_MATRIX.md`.
