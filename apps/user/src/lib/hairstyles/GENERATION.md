# Explore soch turmaklari — generatsiya qo'llanmasi

Tashqarida (Midjourney / Leonardo) generatsiya qilish uchun promptlar.
Natija: `apps/user/public/hairstyles/{men|women}/{age_group}/{slug}.webp` (768×1024, WebP ~85%).

## Yosh guruhlari (age_group)

| Guruh | Yosh | Papka |
|-------|------|-------|
| `kids` | 10–12 | `{audience}/kids/` |
| `teen` | 13–17 | `{audience}/teen/` |
| `young` | 18–29 | `{audience}/` (flat, mavjud) |
| `adult` | 30–44 | `{audience}/adult/` |
| `mature` | 45+ | `{audience}/mature/` |

Har bir yosh guruhi uchun **bir xil fon, bir xil maket** — faqat model yoshi va soch turmaklari farq qiladi.

## Umumiy qoidalar

| Parametr | Qiymat |
|----------|--------|
| Fon | `#E8E8E8` kulrang studiya |
| Poza | Old tomondan, yelka darajasi, neytral ifoda |
| Nisbat | 3:4 (768×1024 yoki 900×1200) |
| Format | WebP |

## 1. Bazaviy portrait (reference)

### Erkak — `men/{age_group}/_reference.webp`

```
Professional studio portrait, [AGE DESCRIPTION] Central Asian man, neutral light gray background #E8E8E8,
front-facing, shoulders visible, neutral short hair, soft even lighting, photorealistic,
no jewelry, clean skin, 3:4 aspect ratio
```

**Yosh tavsiflari (AGE DESCRIPTION):**
- `kids` — boy age 10-12
- `teen` — teenage boy age 14-16
- `young` — young man age 22-28
- `adult` — man age 35-42
- `mature` — mature man age 50-58

### Ayol — `women/{age_group}/_reference.webp`

```
Professional studio portrait, young Central Asian woman, neutral light gray background #E8E8E8,
front-facing, shoulders visible, neutral medium length hair, soft even lighting, photorealistic,
minimal makeup, clean skin, 3:4 aspect ratio
```

## 2. Uslub variant prompt (har biri)

```
Same person as reference, identical face and pose, identical gray background #E8E8E8,
only hairstyle changed to [STYLE NAME], professional barber/salon result, photorealistic, 3:4
```

**Midjourney:** `--cref [reference-url]` yoki Character Reference  
**Leonardo:** Character Reference + Image Guidance

## 3. Erkak uslublari (12)

| Fayl | Prompt ichidagi STYLE NAME |
|------|---------------------------|
| `men/{age_group}/mid-fade.webp` | mid fade haircut, clean taper |
| `men/low-fade.webp` | low fade haircut |
| `men/skin-fade.webp` | skin fade buzz cut sides |
| `men/buzz-cut.webp` | buzz cut, uniform short |
| `men/textured-crop.webp` | textured crop, modern short top |
| `men/pompadour.webp` | pompadour, volume on top |
| `men/undercut.webp` | undercut, short sides long top |
| `men/side-part.webp` | classic side part, neat |
| `men/french-crop.webp` | french crop, short fringe |
| `men/slick-back.webp` | slick back, combed back hair |
| `men/curly-top-fade.webp` | curly hair on top with fade sides |
| `men/modern-mullet.webp` | modern mullet, short front longer back |

## 4. Ayol uslublari (12)

| Fayl | Prompt ichidagi STYLE NAME |
|------|---------------------------|
| `women/soft-bob.webp` | soft bob haircut |
| `women/long-layers.webp` | long layered hair |
| `women/balayage.webp` | balayage highlighted long hair |
| `women/pixie-cut.webp` | pixie cut short |
| `women/beach-waves.webp` | beach waves medium length |
| `women/straight-lob.webp` | straight lob haircut |
| `women/curtain-bangs.webp` | curtain bangs medium hair |
| `women/shag-cut.webp` | shag cut layered |
| `women/braids.webp` | braided hairstyle |
| `women/updo-bun.webp` | elegant updo bun |
| `women/blunt-cut.webp` | blunt cut straight |
| `women/highlights.webp` | highlighted medium hair |

## 5. Tekshiruv ro'yxati

- [ ] Yuz ikkala reference bilan bir xil
- [ ] Fon #E8E8E8 bir xil
- [ ] Faqat soch o'zgargan
- [ ] 24 ta fayl to'g'ri nomlangan
- [ ] WebP sifat ~85, hajm < 200 KB har biri

Placeholder rasmlar `scripts/generate-hairstyle-placeholders.mjs` bilan yaratilgan — AI rasmlar tayyor bo'lganda ustiga yozing.
