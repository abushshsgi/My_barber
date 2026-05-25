# MySaloon — User app (Vite + React)

Mobil mijoz ilovasi: salon/sartarosh qidirish, band qilish, chat.

## Ishga tushirish

```bash
# Monorepo root
npm run dev:user
```

Brauzer: http://localhost:3000

Backend: `backend/` da `python manage.py runserver` (port 8000).

## Env

Nusxa: `cp .env.example .env`

| O‘zgaruvchi | Maqsad |
|-------------|--------|
| `NEXT_PUBLIC_API_URL` / `VITE_API_URL` | Django API (production: `https://api.mysaloon.uz`) |
| `NEXT_PUBLIC_AUTH_KIND=user` | JWT kalitlarini ajratish |

Production build: `.env.production` (Vercel va Capacitor uchun).

## PWA (iOS)

Vercel’da `www.mysaloon.uz` deploy qiling. iOS foydalanuvchilar Safari → Share → **Add to Home Screen**.

Vercel env:

```env
NEXT_PUBLIC_API_URL=https://api.mysaloon.uz
NEXT_PUBLIC_AUTH_KIND=user
```

## Capacitor (Android / Play Market)

```bash
npm run cap:android    # root — build + sync
npm run cap:open -w user-web   # Android Studio
```

Android Studio’da signed `.aab` yig‘ib Play Console’ga yuklang.

## Build

```bash
npm run build -w user-web
```

Chiqish: `dist/client`
