# MySaloon Partner — Barber panel (Vite + React)

Sartaroshlar uchun kabinet: bookinglar, mijozlar, daromad, chat.

## Ishga tushirish

```bash
# Monorepo root
npm run dev:barber
```

Brauzer: http://localhost:3003  
Kirish: `/auth`  
Backend: `python manage.py runserver` (port 8000)

## Env

Nusxa: `cp .env.example .env`

| O‘zgaruvchi | Maqsad |
|-------------|--------|
| `VITE_API_URL` / `NEXT_PUBLIC_API_URL` | Django API (production: `https://api.mysaloon.uz`) |

Production build: `.env.production`

## PWA (iOS)

Vercel’da `partner.mysaloon.uz` deploy qiling. iOS barberlar Safari → Share → **Add to Home Screen**.

Vercel env:

```env
VITE_API_URL=https://api.mysaloon.uz
```

Railway:

```env
FRONTEND_BARBER_ORIGIN=https://partner.mysaloon.uz
```

## Capacitor (Android / Play Market)

```bash
npm run cap:barber          # root — build + sync
npm run cap:open -w tanstack_start_ts   # Android Studio
```

- App ID: `uz.mysaloon.partner`
- App nomi: **MySaloon Partner**

Android Studio’da signed `.aab` yig‘ib Play Console’ga yuklang (mijoz ilovasidan alohida listing).

## Build

```bash
npm run build -w tanstack_start_ts
```

Chiqish: `dist/client`
