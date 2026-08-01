---
name: speak-uzbek
description: Foydalanuvchi bilan o'zbek tilida (lotin alifbosida) muloqot qilish qoidalari. Use when the user writes in Uzbek, asks the agent to speak Uzbek ("o'zbekcha gapir", "speak me uzbek"), or when answers, explanations, plans, and summaries must be delivered in Uzbek while code and commands stay unchanged.
---

# O'zbekcha gaplash

Foydalanuvchi bilan butun muloqot **o'zbek tilida, lotin alifbosida** bo'ladi. Bu kelgusi barcha javoblarga tegishli — foydalanuvchi ingliz yoki rus tilida yozsa ham, javob o'zbekcha bo'ladi (agar u tilni ochiq o'zgartirishni so'ramasa).

## Nima o'zbekcha bo'ladi

- Chat javoblari, tushuntirishlar, xulosalar
- Reja va qadamlar ro'yxati (todo, plan)
- Savollar va aniqlashtirishlar
- Xato tahlili va tavsiyalar

## Nima o'zgarmaydi

Bularni tarjima qilmaslik kerak — asl holida qoldiriladi:

- Kod, o'zgaruvchi va funksiya nomlari
- Fayl va papka yo'llari
- Terminal buyruqlari va ularning chiqishi
- Kod ichidagi izohlar — mavjud fayl uslubiga mos yoziladi
- Commit xabarlari — bu repoda inglizcha (masalan: `Fix home catalog loading, location sync, and API performance`)
- Lint va build xatolarining asl matni; xatoni keltirib, keyin o'zbekcha tushuntiriladi

## Texnik atamalar

Keng tarqalgan texnik so'zlar o'zbek gapi ichida shundayligicha ishlatiladi, sun'iy tarjima qilinmaydi: `commit`, `push`, `branch`, `build`, `deploy`, `component`, `endpoint`, `migration`, `state`, `hook`, `props`, `cache`, `lint`.

## Uslub

- Birinchi gapda natijani ayting, tafsilot keyin
- Qisqa va aniq gaplar, ortiqcha muqaddima yo'q
- To'liq gaplar bilan yozing — qisqartma va strelkali zanjirlar (`A → B`) emas
- Fayl, funksiya va klass nomlarini backtick ichida bering

## Misollar

**Yaxshi:**

> Home sahifasidagi crash tuzatildi. Sabab: `lucide-react` dan kelgan `Map` ikonkasi global `Map` konstruktorini yashirib qo'ygan edi. `apps/user/src/components/desktop/home/HomeBazaarLayouts.tsx` faylida import nomi `MapIcon` ga o'zgartirildi.

**Yomon** (aralash til, tarjima qilingan kod nomlari):

> Home page-dagi crash fixed. Xarita-ikonka konstruktorni yashirgan, shuning uchun uy-bozor-tartiblari faylini o'zgartirdim.
