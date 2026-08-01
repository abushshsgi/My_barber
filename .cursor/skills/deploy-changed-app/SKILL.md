---
name: deploy-changed-app
description: Faqat o'zgargan appni deploy qiladi — backend tahrirlansa Railway, apps/user, apps/admin yoki apps/barber tahrirlansa faqat o'sha Vercel loyihasi. Uchta frontendni birdan Vercelga deploy qilishning oldini oladi. Use when deploying, pushing to main, or when the user asks to deploy only the edited app (user, admin, barber, backend) instead of everything.
---

# Faqat o'zgargan appni deploy qilish

My_barber monorepo'da to'rtta mustaqil deploy nishoni bor. **Bitta appni tahrirlab, hammasini deploy qilish taqiqlanadi** — faqat o'zgargani chiqadi.

## Deploy xaritasi

| O'zgargan yo'l | Nishon | Workspace / build |
|---|---|---|
| `apps/user/**` | Vercel loyihasi `user2` (Root Directory `apps/user`) | `user-web` → `npm run build:user` |
| `apps/admin/**` | Vercel admin loyihasi (Root Directory `apps/admin`) | `admin-web` → `npm run build:admin` |
| `apps/barber/**` | Vercel barber loyihasi (Root Directory `apps/barber`) | `tanstack_start_ts` → `npm run build:barber` |
| `backend/**` | Railway (`api.mysaloon.uz`) — **Vercelga aloqasi yo'q** | `bin/release.sh` migratsiyani o'zi bajaradi |
| `packages/**` | Umumiy kod — uchta frontend ham qayta quriladi | Buni bilib turib qiling |
| `scripts/`, `.github/`, `.md` fayllar | Deploy kerak emas | — |

## Ish jarayoni

1. **Nima o'zgarganini aniqlang** — taxmin qilmang:
   ```bash
   git status --short
   git diff --name-only origin/main...HEAD
   ```
2. **Nishonni tanlang** yuqoridagi jadval bo'yicha. Bir nechta app tegib ketgan bo'lsa, o'zgarishlarni alohida commitlarga ajratishni taklif qiling.
3. **Faqat o'sha appni tekshiring:**
   ```bash
   npm run build:admin        # yoki build:user / build:barber
   npm run lint -w admin-web
   ```
4. **Push qiling.** Vercel qolgan applarni o'zi skip qiladi: har bir `apps/<app>/vercel.json` ichidagi `ignoreCommand` → `node ../../scripts/vercel-ignore-build.mjs <app>`. U `VERCEL_GIT_PREVIOUS_SHA`..`VERCEL_GIT_COMMIT_SHA` diffini tekshiradi va app yo'llari tegilmagan bo'lsa `exit 0` bilan build'ni to'xtatadi.
5. **Xulosada aytib bering:** qaysi app deploy bo'ladi va qaysilari skip bo'ladi.

## Muhim qoidalar

- `npm run build:frontends` — bu uchta appni birdan quradi. Faqat lokal tekshiruv uchun, deploy uchun **ishlatilmaydi**.
- Backend o'zgarishi uchun Vercel deploy'i qilinmaydi va Vercel deploy hook chaqirilmaydi. Railway `main` push'idan keyin o'zi ko'taradi.
- Frontend va backend bitta commitda aralashib ketmasin — alohida commit qilinsa, `ignoreCommand` to'g'ri hisoblaydi.
- `.vercel/` va `.env` commit qilinmaydi. `.vercel/repo.json` lokal fayl va unda hozir faqat `user2` loyihasi bog'langan.
- Root'dagi `vercel.json` app deploylariga ta'sir qilmaydi — har bir app o'z `apps/<app>/vercel.json` fayli bilan boshqariladi.
- `.githooks/post-commit` har commitdan keyin avtomatik push qiladi. Ya'ni commit qilish deploy zanjirini boshlab yuborishi mumkin — commitni faqat kerakli app tayyor bo'lganda qiling.

## Qo'lda deploy (kamdan-kam hollarda)

Vercel git integratsiyasi ishlamasa yoki shoshilinch chiqarish kerak bo'lsa:

```bash
cd apps/admin
npx vercel link          # faqat bir marta: bu app hali bog'lanmagan bo'lsa
npx vercel --prod
```

`apps/user` uchun GitHub workflow ham bor: `.github/workflows/deploy-user-vercel.yml` — u faqat `apps/user/**`, `packages/**` yoki `package-lock.json` o'zgarsa ishga tushadi va `VERCEL_USER_DEPLOY_HOOK` sekretini chaqiradi. Admin va barber uchun bunday workflow yo'q, ular Vercel git integratsiyasi orqali chiqadi.

## Ignore mantiqini lokal tekshirish

PowerShell (bu mashinada asosiy shell):

```powershell
$env:VERCEL_GIT_PREVIOUS_SHA="HEAD~1"; $env:VERCEL_GIT_COMMIT_SHA="HEAD"; node scripts/vercel-ignore-build.mjs admin
```

Chiqish `No admin-relevant changes — skipping` bo'lsa build bo'lmaydi, `Changes in admin paths — building` bo'lsa build bo'ladi.

Yangi app qo'shilsa, `scripts/vercel-ignore-build.mjs` ichidagi `PATHS` obyektiga uning yo'llarini qo'shish kerak, aks holda u har doim build bo'ladi.
