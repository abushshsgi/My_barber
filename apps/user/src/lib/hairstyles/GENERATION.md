# Explore soch turmaklari — generatsiya qo'llanmasi

Tashqarida (Midjourney / Leonardo / Imagen) generatsiya qilish uchun promptlar.
Natija: `apps/user/public/hairstyles/{men|women}/{age_group}/{slug}.webp` (768×1024, WebP ~85%).

## Explore erkak personajlari (5 ta)

Har bir personaj uchun **bitta reference** + **12 ta uslub**. To'liq promptlar: [`PERSONA_PROMPTS.md`](./PERSONA_PROMPTS.md)

| # | Laqab | Kod | Reference fayl |
|---|-------|-----|----------------|
| 1 | Britan | EU-3 | `men/personas/britan/reference.webp` |
| 2 | Irland | EU-8 | `men/personas/irland/reference.webp` |
| 3 | Slavyan | EU-6 | `men/personas/slavyan/reference.webp` |
| 4 | Evro | EU-2 | `men/personas/evro/reference.webp` |
| 5 | Fransuz | EU-4 | `men/personas/fransuz/reference.webp` |

**12 ta uslub:** tanlangan personaj yuzi + `--cref reference.webp --cw 100` — faqat soch o'zgaradi.

---

```
ROLE: Explore katalogi uchun professional salon/barber studiya rasmlari generatsiya qiluvchi AI.

QOIDALAR (majburiy):
1. HAR BIR RASM — BOSHQA ERKAK. Bir xil yuz, bir xil odam, Character Reference ishlatma.
2. Milliyat/mamlakat ko‘rsatma shart emas — tabiiy xilma-xil yuzlar.
3. POZA tabiiy: yengil 3/4 burchak (~15°), salon kreslosidan chiqqandek.
   Qattiq to‘g‘ri old tomondan passport/ID suratiga O‘XSHAMASIN.
4. Stok foto, oldindan tayyorlangan katalog, manken ifoda bo‘lmasin.
5. Fon DOIM: solid flat #E8E8E8 (gradient yo‘q).
6. Maket: bosh + yelkalar, 3:4, yumshoq studiya yorug‘ligi.
7. Har safar yangi model + yangi soch — faqat fon va kadrlash uslubi bir xil.
```

## Yosh guruhlari (age_group)

| Guruh | Yosh | Papka |
|-------|------|-------|
| `kids` | 10–12 | `{audience}/kids/` |
| `teen` | 13–17 | `{audience}/teen/` |
| `young` | 18–29 | `{audience}/` (flat) |
| `adult` | 30–44 | `{audience}/adult/` |
| `mature` | 45+ | `{audience}/mature/` |

## Umumiy qoidalar

| Parametr | Qiymat |
|----------|--------|
| Fon | `#E8E8E8` kulrang studiya, flat |
| Poza | Yengil 3/4, tabiiy — **passport/ID emas** |
| Model | **Har rasm = boshqa erkak** |
| Nisbat | 3:4 (768×1024) |
| Format | WebP ~85% |
| Tiniqlik | Ultra sharp, 85mm portrait, 8K detail |

## 1. Bitta uslub uchun to‘liq prompt (namuna)

**Fayl:** `men/adult/mid-fade.webp`

```
ROLE: Explore katalog — har rasm alohida, boshqa erkak, tabiiy poza.

Generate ONE standalone portrait.
Model: man age 38, Mediterranean man, olive skin, dark wavy hair texture.
Hairstyle: mid fade haircut, clean taper, short textured top 3-4cm, crisp barber line-up.

Background: solid flat #E8E8E8 only, no gradient.
Pose: natural relaxed posture, slight three-quarter angle about 15 degrees,
candid fresh-from-barber moment, NOT passport photo, NOT stiff front-facing ID picture,
NOT stock catalog mannequin.

Plain dark t-shirt, soft even studio lighting, photorealistic,
ultra sharp hair and skin detail, 3:4 vertical, 768x1024.
This is a UNIQUE person — different from every other catalog image.
```

### Negative prompt

```
same person, identical face, character reference, clone,
passport photo, ID photo, mugshot, visa photo, stiff front-facing,
dead center stare, stock photo, pre-shot catalog, mannequin,
cartoon, watermark, text, busy background, barber shop, gradient background
```

## 2. Uslub variant (har biri ALOHIDA odam)

**Character Reference ishlatma.** Har fayl uchun yuqoridagi shablonni ishlat — faqat `[PERSONA]` va `[STYLE]` almashtir.

| Fayl | STYLE |
|------|-------|
| `men/adult/mid-fade.webp` | mid fade, clean taper |
| `men/adult/low-fade.webp` | low fade, natural taper |
| ... | ... |

**Personaj misollari (har biri boshqa rasm):**
- Mediterranean, olive skin
- Black, deep brown skin
- East Asian, light skin
- Scandinavian, fair skin
- Middle Eastern, tan skin
- Latino, warm tan skin

## 3. Tekshiruv ro'yxati

- [ ] **Boshqa erkak** — oldingi rasmlardagi yuzga o‘xshamaydi
- [ ] **Passport/ID emas** — tabiiy 3/4, jonli poza
- [ ] Fon `#E8E8E8` bir xil
- [ ] Soch tiniq, barber natijasi real
- [ ] 768×1024 WebP, < 200 KB

## Skriptlar

```bash
python3 apps/user/scripts/generate-hairstyle-placeholders.py

pip install google-genai
export GEMINI_API_KEY=your_key
python3 apps/user/scripts/generate-hairstyle-images.py --audience men --age-group adult --slug mid-fade
python3 apps/user/scripts/generate-hairstyle-images.py --dry-run --all-men
```

Prompt matnlari: `apps/user/scripts/hairstyle_prompts.py`
