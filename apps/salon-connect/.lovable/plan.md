# mysaloon.uz — Mobile UI Design System

## Dizayn yo'nalishi: Modern Ritual (yangilangan)

App-native, mobile-first booking platforma. Faqat ikki rang: **bej krem + qora**. Hech qanday accent rang yo'q — kontrast va weight orqali iyerarxiya.

## Rang sistemasi (FAQAT 2 RANG + soyalar)

```
--background:  #faf8f5   (asosiy bej krem fon)
--surface:     #efe9dd   (kartochka yuzasi, biroz quyuqroq bej)
--surface-2:   #e4dcc9   (ikkilamchi yuza, divider)
--muted:       #6b6258   (yordamchi matn — bejning qora soyasi)
--foreground:  #0a0a0a   (asosiy matn)
--primary:     #0a0a0a   (CTA tugma — qora)
--primary-fg:  #faf8f5   (qora tugmadagi matn — krem)
```

CTA tugmalar **qora fon + krem matn**. Faollik (active state, selected tab, badge) ham qora orqali. Copper/gold/orange yo'q.

## Tipografiya — Bold sans-serif

- **Font:** **Space Grotesk** (variable, weights 400–700) — zamonaviy geometric, klassik emas, bold weights yorqin chiqadi
- **Backup:** Inter (rus/lotin uchun keng qamrov)
- O'lchamlar (mobile-first):
  - Hero / page title: 26px **bold (700)**
  - Section heading: 18px **semibold (600)**
  - Card title: 16px **bold (700)**
  - Body: 14px medium (500)
  - Labels / chips: 11px **bold (700)** uppercase, tracking 0.08em
  - CTA tugma: 14px **bold (700)**, tracking 0.05em
- O'rnatish: `bun add @fontsource-variable/space-grotesk @fontsource-variable/inter`

## Mobile-first responsive

- **Asosiy viewport:** 360–430px (telefonlar)
- Container: `w-full max-w-[480px] mx-auto` — har bir page shu wrapperda
- Safe area: `pt-[env(safe-area-inset-top)]`, `pb-[env(safe-area-inset-bottom)]`
- Bottom nav fixed, h-[68px], 6 tab
- Tap targets minimum 44x44px
- Tablet (≥768): container max-w-[560px] center, padding kattaroq
- Desktop (≥1024): bottom nav o'rniga chap sidebar, content max-w-[720px]

## Arxitektura mosligi (sizning `apps/user` ga)

TanStack file routing:
- `_authenticated.tsx` — layout wrapper (Query, Toaster, BottomNav)
- Pages: `index`, `map`, `salon.$id`, `booking.$salonId`, `booking.barber.$barberId`, `bookings`, `chat`, `chat.$id`, `notifications`, `profile`, `settings`, `favorites`, `support`, `privacy`, `auth`

## Page UI rejasi (mobile)

### Home (`/`)
- Greeting + avatar (top, 24px padding)
- Search bar (rounded-2xl, bg-surface, h-12)
- Category chips (scroll-x): faol = qora fon krem matn
- "Yaqin atrofdagi salonlar" — vertical card stack:
  - Photo 4:3, rounded-2xl
  - Bold nom (16px), masofa + rating (kichik muted)
  - Narx oraliq o'ng tomonda bold
- Mini map preview h-32 → `/map`

### Map (`/map`)
- Full-screen Leaflet
- Top floating tab pill: **Salonlar** / **Ustalar** (qora active)
- Pastda snap-scroll card carousel
- Markerlar: qora doira, active = kattaroq

### Salon Detail (`/salon/$id`)
- Hero photo aspect 4:5
- Bold nom 24px + rating, favorite icon (qora yurak)
- Sticky tab bar: Haqida / Xizmatlar / Ustalar / Sharhlar / Portfolio
- Service rows: nom + davomiyligi (chap), narx + "+" tugma (o'ng)
- Fixed bottom CTA: **"Band qilish"** qora tugma, full width

### Booking Wizard (4 step)
Progress: yuqorida 4 ta doira, faol = qora to'la
1. Usta tanlash — 2-col avatar grid
2. Xizmat tanlash — checkbox list (selected = qora border)
3. Vaqt — sana scroll (gorizontal pills) + 15-min slot grid (3-col)
4. Tasdiqlash — summary kartochka + qora "Tasdiqlash" CTA

### My Bookings (`/bookings`)
- Tab: Kelayotgan / Tarix
- Card: salon thumb + sana/vaqt bold + status badge (bordered)
- Swipe yoki "..." menu: Bekor / Chat / Sharh
- Review modal: 5 yulduz + textarea

### Chat (`/chat`, `/chat/$id`)
- List: avatar, oxirgi xabar, vaqt, unread badge (qora doira)
- Thread: user bubble = qora fon krem matn, barber = surface fon qora matn
- Input bar fixed bottom + send tugma

### Notifications (`/notifications`)
- Type icon (qora outline), title bold, body muted, time
- O'qilmagan = qora dot chapda
- Tap → deep link

### Profile (`/profile`)
- Avatar + ism bold 22px + telefon
- 3 ta metric card (Bookings/Reviews/Favorites): bold raqam katta
- Menu list: Edit / Settings / Til / Support / Privacy / Logout

### Settings / Favorites / Support / Privacy / Auth
- Settings: toggle switches (qora active) + til selector UZ/RU/EN
- Favorites: vertical card list + swipe-to-remove
- Auth: phone + OTP, qora CTA
- Support/Privacy: static content, bold headings

## i18n (UZ / RU / EN)

- `react-i18next` + `src/i18n/locales/{uz,ru,en}.json`
- Default: UZ. Til almashtirgich Settings da
- Hamma UI matnlar `t()` orqali

## Komponentlar

`src/components/`:
- `UserLayout`, `UserBottomNav`, `DesktopSidebar`
- `SalonCard`, `ServiceRow`, `BookingCard`, `BarberAvatar`
- `DatePickerCarousel`, `TimeSlotGrid`, `CategoryChips`
- `LanguageSwitcher`, `RatingStars`, `EmptyState`, `Stepper`

## Animatsiya (framer-motion, restrained)

- Page transition: fade 150ms
- Card press: scale 0.97
- Tab switch: spring soft
- `prefers-reduced-motion` hurmat

## Implementation tartibi

1. Tokens (`src/styles.css`) — faqat bej + qora oklch qiymatlar
2. Space Grotesk + Inter o'rnatish, `main.tsx` da import
3. i18n setup (3 locale)
4. Layout + BottomNav + Sidebar
5. Route fayllar mock data bilan
6. Reusable komponentlar
7. Pages tartibida: Home → Map → Salon → Booking → Bookings → Chat → Notifications → Profile → qolganlari
8. Responsive QA (360 / 414 / 768 / 1280)

## Texnik eslatma

Backend hozir yo'q — barchasi typed mock data bilan. UI to'liq tayyor bo'lgach, ikkinchi iteratsiyada sizning `/api/v1/...` endpointlaringizga TanStack Query orqali bog'lanadi.

---

**Tasdiqlasangiz qurishni boshlayman.**
