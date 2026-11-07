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

## VPS deploy

User ilova Nitro `node-server` sifatida ishlaydi: `node dist/server/index.mjs` (port 3000). Nginx `www.mysaloon.uz` va `mysaloon.uz` ni shu portga uzatadi. Admin va partner statik SPA.

Serverda birinchi marta:

```bash
cd /opt/mysaloon/Mybarber
sudo bash deploy/vps/deploy-frontends.sh all
sudo certbot --nginx -d www.mysaloon.uz -d mysaloon.uz -d admin.mysaloon.uz -d partner.mysaloon.uz
```

`apps/user/index.html` bo'lmasligi kerak — u SSR o'rniga statik fayl bo'lib chiqadi.

## Env

| O'zgaruvchi                     | Qiymat                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `VITE_API_URL`                  | productionda bo'sh — so'rovlar shu domen orqali API ga ketadi                                |
| `VITE_GOOGLE_MAPS_API_KEY`      | Google Maps JS (xarita) — [Cloud Console](https://console.cloud.google.com/google/maps-apis) |
| `NEXT_PUBLIC_BARBER_WEB_ORIGIN` | `https://partner.mysaloon.uz` (ixtiyoriy)                                                    |

To'liq ro'yxat: `.env.example`

## Ma'lumot manbalari

- **REST API:** `src/lib/api/` — asosiy integratsiya (`API_STATUS_MATRIX.md`)
- **Mock/demo:** offers, loyalty, reels va boshqalar hali `mock-data.ts` da
- **WebSocket:** chat va bildirishnomalar (productionda `REDIS_URL` kerak)

## Mobil (Expo React Native)

Native ilova: `apps/mobile` (`npm run dev:mobile` ildizdan).
