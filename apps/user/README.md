# User app (salon-connect)

Mijoz ilovasi — [salon-connect](https://github.com/abushshsgi/salon-connect.git) UI (submodule).  
`apps/user` faqat Vite shell: dev/build `apps/salon-connect` dan ishlaydi.

## Tuzilma

| Joy | Vazifa |
|-----|--------|
| [`../salon-connect/`](../salon-connect/) | Barcha UI, route'lar, mock data — **o'zgartirilmaydi** |
| [`vite.config.ts`](vite.config.ts) | `root` → salon-connect, `@` → `salon-connect/src` |

Eski MyBarber user UI (`src/`, `android/`, `_archive/`) olib tashlangan.

## Ishga tushirish

```bash
git submodule update --init --recursive apps/salon-connect
npm install
npm run dev:user
```

**Vercel (user):** Root Directory `apps/user`. Vercel Git → **Submodules** yoqing; `salon-connect` public yoki deploy key kerak.

## Qoidalar

- `apps/salon-connect/**` ichida commit qilmang.
- Yangilash: `git submodule update --remote apps/salon-connect`
