# Frontend ilovalari (alohida deploy)



Backend bitta serverda qoladi; uchta **mustaqil** Vite/TanStack Start loyihasi — kod va papkalar aralashmaydi.



| Papka | Vazifa | Asosiy URL (lokal) |

|--------|--------|---------------------|

| `user` | Mijozlar: xarita, salon, bron | `http://localhost:3000` |

| `admin` | Admin panel | `http://localhost:3001` (`/admin/...`) |

| `barber` | Sartarosh kabineti | `http://localhost:3003` — asosiy `/`, kirish `/auth` (`/barber` prefiksi yo‘q) |



Umumiy API va utilitarlar: `../packages/shared`.



## Loyiha ildizidan



```bash

npm install

npm run dev:user    # 3000

npm run dev:admin   # 3001

npm run dev:barber  # 3003

```



Build:



```bash

npm run build:user

npm run build:admin

npm run build:barber

# yoki

npm run build:frontends

```



## Alohida domenlar (mysaloon.uz)



| Ilova | VPS domen | Env |

|--------|----------------|-----|

| mijoz | `https://www.mysaloon.uz` | `VITE_API_URL` **o‘chirish** (same-origin `/api/v1` proxy) |
| admin | `https://admin.mysaloon.uz` | `VITE_API_URL` **o‘chirish** (nginx `/api/v1` ni API ga uzatadi) |
| barber | `https://partner.mysaloon.uz` | `VITE_API_URL=https://api.mysaloon.uz` |



**Railway (backend)** — `DisallowedHost` bo‘lmasligi uchun:



```env

DJANGO_DEBUG=false

DJANGO_ALLOWED_HOSTS=api.mysaloon.uz,.railway.app

FRONTEND_USER_ORIGIN=https://www.mysaloon.uz,https://mysaloon.uz

FRONTEND_ADMIN_ORIGIN=https://admin.mysaloon.uz

FRONTEND_BARBER_ORIGIN=https://partner.mysaloon.uz

```



Mijoz ilovasi: `NEXT_PUBLIC_BARBER_WEB_ORIGIN=https://partner.mysaloon.uz`



1. **DNS** — `www`, `mysaloon.uz`, `admin`, `partner` VPS IP siga. `api` Railway da qoladi.

2. **Server** — `sudo bash deploy/vps/deploy-frontends.sh all`, keyin certbot.

3. **Backend** `FRONTEND_*_ORIGIN` — CORS uchun (yuqoridagi ro‘yxat).

4. O‘zgaruvchilarni o‘zgartirgach — Railway ni qayta chiqaring, frontendni VPS da qayta build qiling.



## Deploy (VPS)



Uchala frontend bitta serverda: `/opt/mysaloon/Mybarber`. User ilova Node (port 3000), admin va partner nginx statik papkasi. Buyruq: `sudo bash deploy/vps/deploy-frontends.sh auto`. API `https://api.mysaloon.uz` da qoladi.



## Mobil (Expo React Native)

| Ilova | Web | Native |
|--------|-----|--------|
| mijoz | `apps/user` — `www.mysaloon.uz` (PWA) | `apps/mobile` (Expo) |
| barber | `apps/barber` — `partner.mysaloon.uz` (PWA) | — |

```bash
npm run dev:mobile
```

Batafsil: [`MOBILE_PRODUCTION.md`](MOBILE_PRODUCTION.md), [`mobile/README.md`](mobile/README.md).


