# Users app — yangi UI screenshotlari

Bu papkadagi suratlar `cursor/users-app-ui-dizayni-bb03` shoxida olingan.
Brend rang oilasi: barber va admin paneli bilan **bir xil** iliq krem (warm
cream) fon + qora primary + iliq gold/teal accent. Mijoz ilovasi farqi: radius
biroz katta (mobil-first), iliqroq fon ohangida, dock va sheet uchun qoʻshimcha
shadow/surface tokenlari.

| Surat | Sahifa | Diqqat |
|-------|--------|--------|
| `01-auth-signin.png` | `/auth` | Krem fon, qora "Sign in" CTA, gold "EN" til pill’i, Outfit/Manrope shrift |
| `02-profile-loading.png` | `/profile` | Krem fon, **yangi floating dock** (Profil tab faol — qora doiraga oq icon) |
| `03-bookings-loading.png` | `/bookings` | Krem fon, gold rangli `text-accent` spinner, Bandlar tab faol |
| `04-notifications-loading.png` | `/notifications` | Xabar tab faol, dock kremga blur bilan singgan |
| `05-map-empty.png` | `/map` | `YAQIN ATROFINGIZ` label-eyebrow, Outfit sarlavha, 1/2/3 km radius selektor, Salonlar/Barberlar segment, empty state karta |
| `06-home-map.png` | `/` | Discover sahifaning xarita qatlami (sheet va header ustida) |

## Olish usuli

Lokal mashinada:

```bash
npm install
npm run dev:user     # http://localhost:3000

# Suratlarni qayta olish (puppeteer-core va Chrome talab qiladi)
node tools/screenshots.js
```

CI yoki cloud’da: brauzerni `--no-sandbox` va `--disable-setuid-sandbox`
bayroqlari bilan ishga tushiring.
