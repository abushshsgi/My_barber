# Frontend ilovalari (alohida deploy)

Backend bitta serverda qoladi; to‘rtta **mustaqil** Next.js loyihasi — kod va papkalar aralashmaydi.

| Papka | Vazifa | Asosiy URL (lokal) |
|--------|--------|---------------------|
| `user-web` | Mijozlar: xarita, salon, bron | `http://localhost:3000` |
| `admin-web` | Admin panel | `http://localhost:3001` (`/admin/...`) |
| `barber-web` | Sartarosh kabineti (oldingi UI) | `http://localhost:3002` — asosiy `/`, kirish `/auth` (`/barber` prefiksi yo‘q) |
| `barber-panel-web` | Sartarosh panel (yangi UI — clone) | `http://localhost:3003` — asosiy `/`, kirish `/auth` |

Umumiy API va utilitarlar: `../packages/shared` (`@/lib/*` orqali har bir ilovada ulanadi).

## Loyiha ildizidan

```bash
npm install
npm run dev:user    # 3000
npm run dev:admin   # 3001
npm run dev:barber  # 3002
npm run dev:barber-panel  # 3003
```

Build:

```bash
npm run build:user
npm run build:admin
npm run build:barber
npm run build:barber-panel
# yoki
npm run build:frontends
```

## Alohida domenlar (tavsiya)

Masalan: `app.mybarber.uz` (mijoz), `admin.mybarber.uz` (admin), `barber.mybarber.uz` (sartarosh), `panel.mybarber.uz` (yangi sartarosh panel).

1. **DNS** — har to‘rtta domenni Vercel (yoki boshqa host) ga yo‘naltirasiz.
2. **Har bir ilova** — alohida Vercel project: Root Directory `apps/user-web` / `apps/admin-web` / `apps/barber-web` / `apps/barber-panel-web`.
3. **Backend** `CORS_ALLOWED_ORIGINS` — to‘rtta `https://...` manzil + lokal portlar.
4. **Mijoz ilovasi** `NEXT_PUBLIC_BARBER_WEB_ORIGIN=https://barber.mybarber.uz` — profil va xabarnomalardan sartarosh paneliga o‘tish uchun to‘g‘ri domen.

Barcha ilovalarda: `NEXT_PUBLIC_API_URL=https://api.mybarber.uz` (backend).

## Deploy (masalan Vercel)

Har bir ilova uchun **alohida Vercel project**: Root Directory mos ravishda `apps/user-web`, `apps/admin-web`, yoki `apps/barber-web`. Environment: `NEXT_PUBLIC_API_URL` — backend HTTPS manzili.

Monorepo: Vercelda “Include source files outside root” yoki workspace sozlamalari kerak bo‘lishi mumkin; `package.json` loyiha ildizida, `npm install` ildizdan bajariladi.
