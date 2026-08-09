---
name: react-native-mobile-only
description: >-
  Barcha joriy feature/bugfix/UI ishlari faqat React Native ilova (apps/mobile)
  uchun qilinadi — apps/user, apps/admin, apps/barber webga tegilmaydi.
  Use when implementing Morph AI, face check, selfie upload, toast/notification
  animations, try-on, Expo, React Native screens, or any product work the user
  describes while targeting the mobile app; also when the user says mobile,
  React Native, Expo, apps/mobile, yoki "web emas".
---

# Faqat React Native (apps/mobile)

## Qoida (qattiq)

1. **Default nishon:** `apps/mobile/**` (Expo + React Native).
2. **Taqiqlangan (so‘ralmasa):** `apps/user/**`, `apps/admin/**`, `apps/barber/**` — web UI/kodiga o‘zgartirish kiritma.
3. **Backend** (`backend/**`) faqat mobil API uchun kerak bo‘lsa (masalan yagona `NO_FACE_MESSAGE`) — minimal diff.
4. Foydalanuvchi ochiq aytmasa, web (`localhost:3000`, Vite, Sonner, TanStack Router) yechimini **taklif qilma va yozma**.
5. Run/test: `apps/mobile` — `npx expo start` / `npm run dev:mobile` (odatda `http://localhost:8081` web preview yoki device). `npm run dev:user` ni o‘zi so‘ramasa ishga tushirma.

## Ish tartibi

1. Avval `apps/mobile/src/` ichida tegishli screen/hook/api ni top.
2. UI: React Native (`View`, `Text`, `Animated`, `Pressable`) — web Sonner/shadcn emas.
3. Toast/ogohlantirish: mobil ichidagi banner/`Animated` slide-in (yuqoridan) + auto dismiss; `Alert` faqat ruxsat/system holatlarida.
4. Morph AI yuz tekshiruvi: `apps/mobile/src/api/ai.ts` (`checkAiStyleFace`) + `MorphResultsScreen` / capture oqimi.
5. Xato matni foydalanuvchiga tushunarli bo‘lsin — `API 400:` kabi prefikslarni ko‘rsatma.

## Tez yo‘l xaritasi

| Vazifa | Joy |
|---|---|
| Face-check / analyze | `apps/mobile/src/api/ai.ts`, `screens/morph/MorphResultsScreen.tsx` |
| Selfie pick | `apps/mobile/src/lib/selfie.ts` |
| Morph navigatsiya | `apps/mobile/src/navigation/MorphStack.tsx` |
| Boshqa Morph ekranlar | `apps/mobile/src/screens/morph/` |

## Commit

- Faqat `apps/mobile/**` (va kerak bo‘lsa minimal `backend/**`) stage qil.
- Web fayllarni (`apps/user/**` va hokazo) shu ish uchun commitga qo‘shma.
