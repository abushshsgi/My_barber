---
name: deploy-changed-app
description: Faqat o'zgargan appni deploy qiladi — backend tahrirlansa Railway, frontend tahrirlansa VPS dagi shu ilova. Use when deploying, pushing to main, or when the user asks to deploy only the edited app (user, admin, barber, backend) instead of everything.
---

# Faqat o'zgargan appni deploy qilish

My_barber monorepo'da to'rtta mustaqil deploy nishoni bor. **Bitta appni tahrirlab, hammasini deploy qilish taqiqlanadi** — faqat o'zgargani chiqadi.

## Deploy xaritasi

| O'zgargan yo'l | Nishon | Workspace / build |
|---|---|---|
| `apps/user/**` | VPS `www.mysaloon.uz` (Node, port 3000) | `user-web` → `npm run build:user` |
| `apps/admin/**` | VPS `admin.mysaloon.uz` (nginx statik) | `admin-web` → `npm run build:admin` |
| `apps/barber/**` | VPS `partner.mysaloon.uz` (nginx statik) | `tanstack_start_ts` → `npm run build:barber` |
| `backend/**` | Railway (`api.mysaloon.uz`) — VPS frontendiga tegmaydi | `bin/release.sh` migratsiyani o'zi bajaradi |
| `packages/**` | Umumiy kod — uchta frontend ham qayta quriladi | Buni bilib turib qiling |
| `deploy/vps/**` | nginx va user servisi | `sudo bash deploy/vps/deploy-frontends.sh auto` |
| `scripts/`, `.md` fayllar | Deploy kerak emas | — |

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
4. **Push qiling.** VPS dagi `deploy/vps/deploy-frontends.sh auto` faqat o'zgargan frontendni build qiladi. API Railway da qoladi.
5. **Xulosada aytib bering:** qaysi app VPS da yangilanadi. Backend o'zgarishi frontend deployini boshlamaydi.

## Muhim qoidalar

- `npm run build:frontends` — uchta appni birdan quradi. VPS da birinchi chiqarish: `sudo bash deploy/vps/deploy-frontends.sh all`.
- Backend o'zgarishi frontendni qayta build qilmaydi. Railway `main` push'idan keyin o'zi ko'taradi.
- Frontend va backend bitta commitda aralashib ketmasin.
- `.env` va `deploy/vps/build.env` commit qilinmaydi. `build.env` da `VITE_GOOGLE_MAPS_API_KEY` va `VITE_GOOGLE_CLIENT_ID` turadi.
- `.githooks/post-commit` har commitdan keyin avtomatik push qiladi. Commitni faqat kerakli app tayyor bo'lganda qiling.
- GitHub workflow `.github/workflows/deploy-frontends-vps.yml` faqat `VPS_HOST`, `VPS_USER` va `VPS_SSH_KEY` qo'yilganda serverga kiradi.

## Qo'lda deploy

Serverda:

```bash
cd /opt/mysaloon/Mybarber
sudo bash deploy/vps/deploy-frontends.sh user
```

`user` o'rniga `admin`, `barber`, `auto` yoki `all`.
