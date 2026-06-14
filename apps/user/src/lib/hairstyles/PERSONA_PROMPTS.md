# Explore personajlari — 5 ta erkak model

Har bir personaj uchun **bitta reference** (three-quarter) + **12 ta soch uslubi**.
Persona tanlanganda Explore pastdagi rasmlar shu modelnikiga o'zgaradi.

## Papka tuzilmasi

```
public/hairstyles/men/personas/{persona_id}/
  reference.webp    ← bitta three-quarter reference
  mid-fade.webp
  low-fade.webp
  ... (12 ta uslub)
```

## 5 ta personaj (tasdiqlangan tartib)

| # | ID | Laqab | Kod |
|---|-----|-------|-----|
| 1 | `britan` | Britan | EU-3 |
| 2 | `irland` | Irland | EU-8 |
| 3 | `slavyan` | Slavyan | EU-6 |
| 4 | `evro` | Evro | EU-2 |
| 5 | `fransuz` | Fransuz | EU-4 |

---

## 1 — Britan (EU-3)

**Fayl:** `men/personas/britan/reference.webp`

```
Professional barber studio portrait, young British European man age 24,
fair skin with light freckles, green-hazel eyes, sandy brown hair,
neutral short textured cut, clean-shaven,

three-quarter view, subtle natural smile suppressed, candid barber moment,
plain white t-shirt, solid flat #E8E8E8 background, bright soft lighting,
ultra sharp photorealistic, 3:4 vertical, 768x1024
```

---

## 2 — Irland (EU-8)

**Fayl:** `men/personas/irland/reference.webp`

```
Professional barber studio portrait, young Irish European man age 24,
fair skin with warm undertone, light green eyes, reddish-brown hair,
neutral short textured cut, light ginger stubble,

three-quarter angle, friendly neutral expression, natural candid pose,
plain white t-shirt, solid flat #E8E8E8, soft studio light,
photorealistic, sharp hair texture, 3:4 vertical, 768x1024
```

---

## 3 — Slavyan (EU-6)

**Fayl:** `men/personas/slavyan/reference.webp`

```
Professional barber studio portrait, young Eastern European man age 26,
pale Slavic skin, gray-green eyes, straight dark ash-brown hair,
neutral short cut, clean-shaven, defined Slavic jawline,

three-quarter profile looking slightly away, neutral expression,
plain white t-shirt, solid flat #E8E8E8, even studio light,
photorealistic, 85mm portrait, 3:4 vertical, 768x1024
```

---

## 4 — Evro (EU-2) ✅ tayyor assetlar

**Papka:** `men/personas/evro/`

| Fayl | Holat |
|------|--------|
| `reference.webp` | ✅ |
| `mid-fade.webp` | ✅ |
| `skin-fade.webp` | ✅ |
| `buzz-cut.webp` | ✅ |
| `textured-crop.webp` | ✅ |
| `low-fade.webp` | ⏳ hali generatsiya qilinmadi (fallback: `men/low-fade.webp`) |

**Reference prompt:**

```
Professional barber studio portrait, young man age 24, Caucasian European,
fair skin, light brown eyes, defined jawline with light stubble,
thick dark brown wavy hair, neutral short length, natural texture,

three-quarter profile, head turned slightly right, looking off-camera,
relaxed candid expression, NOT front-facing passport pose,

plain white crew-neck t-shirt,
solid flat background #E8E8E8, soft studio lighting,
ultra sharp photorealistic, 85mm portrait, 8K detail,
3:4 vertical, 768x1024
```

---

## 5 — Fransuz (EU-4)

**Fayl:** `men/personas/fransuz/reference.webp`

```
Professional barber studio portrait, young French European man age 27,
light skin, dark brown eyes, refined features, light designer stubble,
dark brown hair with natural wave, neutral short sides,

three-quarter profile right, elegant relaxed posture, NOT passport pose,
plain white crew-neck, solid flat #E8E8E8, soft diffused studio light,
photorealistic barber catalog, 3:4 vertical, 768x1024
```

---

## 12 ta uslub (reference tasdiqlangach)

Har bir personaj uchun `--cref reference.webp --cw 100` — faqat soch o'zgaradi.

Negative prompt (`STYLE_NEGATIVE_PROMPT`):

```
different person, changed face, changed age, changed skin tone,
passport photo, ID photo, mugshot, stiff front-facing,
cartoon, anime, watermark, text, logo, busy background, gradient, vignette,
deformed face, multiple people
```
