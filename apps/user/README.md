# User app (salon-connect UI)

Mijoz ilovasi — [salon-connect](https://github.com/abushshsgi/salon-connect) UI **1:1** (`apps/salon-connect` repoda, submodule emas).

`apps/user` faqat Vite shell: `vite.config.ts` → `root: ../salon-connect`.

## Ishga tushirish

```bash
npm install
npm install --prefix apps/salon-connect --no-package-lock
npm run dev:user
```

## Vercel

Root Directory: `apps/user`. `installCommand` salon-connect dependencylarini ham o‘rnatadi.

**Vercel dashboard (muhim):** Settings → Build → Override larni **o‘chiring** yoki quyidagiga moslang:
- Output Directory: `dist` ( **`dist/client` emas** )
- Install Command: repodagi `vercel.json` dagi buyruq
- Framework: Other / null

## Yangilash (salon-connect dan)

```bash
cd apps/salon-connect
git init && git remote add origin https://github.com/abushshsgi/salon-connect.git
git fetch origin && git checkout origin/main -- .
# keyin My_barber repoga commit
```
