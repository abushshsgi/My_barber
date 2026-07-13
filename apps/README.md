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



| Ilova | Vercel domen | Env |

|--------|----------------|-----|

| mijoz | `https://www.mysaloon.uz` | `VITE_API_URL` **o‘chirish** (same-origin `/api/v1` proxy) |
| admin | `https://admin.mysaloon.uz` | `VITE_API_URL` **o‘chirish** (same-origin `/api/v1` proxy) |
| barber | `https://partner.mysaloon.uz` | Web: `VITE_API_URL` **o‘chirish**; Capacitor: `VITE_API_URL=https://api.mysaloon.uz` |



**Railway (backend)** — `DisallowedHost` bo‘lmasligi uchun:



```env

DJANGO_DEBUG=false

DJANGO_ALLOWED_HOSTS=api.mysaloon.uz,.railway.app

FRONTEND_USER_ORIGIN=https://www.mysaloon.uz,https://mysaloon.uz

FRONTEND_ADMIN_ORIGIN=https://admin.mysaloon.uz

FRONTEND_BARBER_ORIGIN=https://partner.mysaloon.uz

```



Mijoz ilovasi: `NEXT_PUBLIC_BARBER_WEB_ORIGIN=https://partner.mysaloon.uz`



1. **DNS** — frontend domenlar Vercel ga, `api` subdomain Railway ga.

2. **Har bir ilova** — alohida Vercel project: Root Directory `apps/user` / `apps/admin` / `apps/barber`.

3. **Backend** `FRONTEND_*_ORIGIN` — CORS uchun (yuqoridagi ro‘yxat).

4. O‘zgaruvchilarni o‘zgartirgach — Railway va Vercel da **Redeploy**.



## Deploy (masalan Vercel)



Har bir ilova uchun **alohida Vercel project**: Root Directory mos ravishda `apps/user`, `apps/admin`, yoki `apps/barber`. Environment: `VITE_API_URL` — backend HTTPS manzili.



Monorepo: Vercelda “Include source files outside root” yoki workspace sozlamalari kerak bo‘lishi mumkin; `package.json` loyiha ildizida, `npm install` ildizdan bajariladi.



## Mobil (PWA + Capacitor)



| Ilova | iOS | Android Play Market | Script |

|--------|-----|---------------------|--------|

| mijoz (`apps/user`) | PWA — `www.mysaloon.uz` | Capacitor `uz.mysaloon.app` | `npm run cap:android` |

| barber (`apps/barber`) | PWA — `partner.mysaloon.uz` | Capacitor `uz.mysaloon.partner` | `npm run cap:barber` |



Batafsil: [`user/README.md`](user/README.md), [`barber/README.md`](barber/README.md).


