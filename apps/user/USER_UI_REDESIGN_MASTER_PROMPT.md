# MyBarber — Users App: To‘liq UI/UX Redesign Master Prompt

Quyidagi blokni **butunlay copy–paste** qilib boshqa AI agentga yoki dizayn+implementatsiya sessiyasiga bering. Maqsad: `apps/user` mijoz ilovasini **yangi, zamonaviy, qulay** UI bilan qayta chizish — **barcha mavjud funksiyalar, algoritmlar va API contract o‘zgarmasdan** qoladi.

---

## MASTER PROMPT (copy from here)

```
Sen senior product designer + senior frontend engineer sifatida ishlayapsan.
Vazifa: Mybarber monoreposidagi mijoz ilovasi (`apps/user`) uchun BUTUNLAY YANGI, premium, mobil-first UI/UX dizaynini loyihalab, keyin React kodiga implement qilish.

═══════════════════════════════════════════════════════════════════════════════
A. LOYIHA KONTEKSTI
═══════════════════════════════════════════════════════════════════════════════

Mahsulot: MyBarber — O‘zbekistonda salon va sartaroshlarga onlayn band (booking) qilish platformasi.
Ilova: `apps/user` — faqat MIJOZ (customer) uchun. Barber boshqaruvi bu ilovada EMAS.

Texnologiya (o‘zgartirilmasin):
- Vite + React 18, TypeScript
- TanStack Router (file routes: `src/routes/`)
- TanStack Query (server state)
- Tailwind CSS v4 + CSS tokenlar (`src/styles.css`)
- Framer Motion (animatsiya, `prefers-reduced-motion` bilan)
- shadcn-style primitives: `src/components/ui/*`
- Lucide React — barcha ikonalar (emoji UI ikona sifatida YO‘Q)
- `@mybarber/shared`: `api.ts`, `salon-queries`, `barber-queries`, `ws-url`, `media`, `mapSalon`, `public-urls`
- Capacitor Android shell mavjud (`apps/user/android/`)
- PWA install hint mavjud

Layout qoidalari:
- `UserLayout`: `max-w-md` mobil konteyner, `pb-28` bottom nav uchun, `/auth` da nav yo‘q
- `UserBottomNav`: 6 tab — Asosiy, Xarita, Bandlar, Chat, Xabar, Profil
- `useUserNotificationWs` — layout ichida WS invalidation

Muhim hujjatlar (implementatsiyadan oldin o‘qi):
- `apps/user/STRUCTURE_OVERVIEW.md`
- `apps/user/API_STATUS_MATRIX.md`
- `apps/user/FLOW_REGRESSION_CHECKLIST.md`

═══════════════════════════════════════════════════════════════════════════════
B. DIZAYN YO‘NALISHI (YANGI UI — senior daraja)
═══════════════════════════════════════════════════════════════════════════════

Maqsad: Yandex Go / Uber / premium beauty app darajasidagi **aniq, tez, ishonchli** mobil tajriba.

Vizual konsept (yangilash mumkin, lekin sifat barieri qat’iy):
- **Premium black + warm neutral + gold accent** (hozirgi tokenlar asosida evolyutsiya, lekin vizual yangilash ruxsat)
- Typography: Plus Jakarta Sans yoki yaxshiroq juftlik (display + body aniq ierarxiya)
- Kartalar: yumaloq `rounded-2xl` / `rounded-3xl`, yengil shadow (`shadow-soft`, `shadow-luxury`), border subtle
- **Floating bottom dock** — glass/blur effekt, safe-area, active state aniq
- **Map-first home** — to‘liq ekran xarita + pastda draggable bottom sheet (Yandex Go uslubi)
- Micro-interactions: 150–300ms, `whileTap` faqat reduced-motion yo‘q bo‘lsa
- Dark mode ixtiyoriy (tokenlar `styles.css` da); light default

UX tamoyillari:
- Har bir ekranda: loading skeleton | error + retry | empty + keyingi qadam CTA
- Bir qo‘l bilan foydalanish: thumb zone, 44px+ touch targets
- Progress ko‘rsatkichlari booking wizardda (4 qadam)
- Statuslar rang + matn + ikon bilan (faqat rang emas)
- O‘zbekcha asosiy copy; i18n (`locale-provider`, `user-auth` messages) buzilmaydi

Anti-patternlar (YO‘Q):
- Emoji ikon sifatida
- Barber-only actionlar (membership accept/decline, jamoa tasdiqlash)
- Legacy `/api` (faqat `/api/v1`)
- Layout shift hover effektlari
- Butun framework almashtirish

═══════════════════════════════════════════════════════════════════════════════
C. TO‘LIQ MARSHRUT XARITASI
═══════════════════════════════════════════════════════════════════════════════

| Route | Page view | Auth |
|-------|-----------|------|
| `/` | `Index.tsx` | Yo‘q |
| `/map` | `MapView.tsx` | Yo‘q |
| `/salon/$id` | `SalonPage.tsx` | Qisman (favorites login) |
| `/booking/$salonId` | `BookingFlow.tsx` | Majburiy → `/auth?next=...` |
| `/booking/barber/$barberId` | `IndependentBookingFlow.tsx` | Majburiy |
| `/bookings` | `MyBookings.tsx` | `AuthGate` |
| `/chat` | `ChatList.tsx` | Login |
| `/chat/$id` | `ChatThread.tsx` | Login |
| `/notifications` | `Notifications.tsx` | `AuthGate` |
| `/profile` | `Profile.tsx` | `AuthGate` |
| `/auth` | `UserAuth.tsx` | — |
| `/favorites` | `Favorites.tsx` | Login |
| `/settings` | `Settings.tsx` | Login |
| `/privacy` | `Privacy.tsx` | Yo‘q |
| `/support` | `Support.tsx` | Yo‘q |

═══════════════════════════════════════════════════════════════════════════════
D. BARCHA FUNKSIONALLIK VA ALGORITMLAR (SAQLANISHI SHART)
═══════════════════════════════════════════════════════════════════════════════

─── D1. ASOSIY SAHIFA `/` (Index) ───

Geolokatsiya algoritmi:
1. `navigator.geolocation.getCurrentPosition` — `enableHighAccuracy`, timeout 20s, maxAge 10s
2. Rad etilsa / mavjud emas → `DEFAULT_CENTER = { lat: 41.3111, lng: 69.2797 }` (Toshkent)
3. `coords` o‘zgarganda `fetchNearbySalons(lat, lng, radiusKm)` — default `radiusKm = 2`

Ma’lumot manbai:
- `GET /api/v1/salons/nearby/?lat=&lng=&radius_km=` — asosiy ro‘yxat
- Agar nearby bo‘sh → fallback `fetchSalons()` → `GET /api/v1/salons/`
- `mapSalonListApi` orqali `Salon` tipiga map

Kategoriya filtri (client-side, API emas):
```ts
matchesCategory(salon, cat):
  cat=null → true
  "premium" → salon.isPremium === true
  "haircut" → /soch|hair|turmak/i.test(name+description)
  "beard" → /soqol|beard/i
  "kids" → /bola|kids|bogcha/i
```
Kategoriyalar: Soch olish, Soqol, Premium, Bolalar (Scissors, Sparkles, Crown, Baby ikonlar)

Bottom sheet algoritmi (Yandex Go):
- 3 holat: `peek=32%`, `mid=60%`, `full=92%` viewport
- Pointer drag: `onPointerDown/Move/Up` — real-time `dragH`, tugaganda ratio bo‘yicha eng yaqin holat
- Sheet tugmasi: peek→mid→full→peek tsikl
- Marker bosilganda: `activeId` + sheet `mid`
- `paddingBottom`: bottom nav + safe-area

Xarita:
- Lazy `DiscoveryMap` — markers faqat valid lat/lng (`|lat|>0.01`)
- `activeId` bilan list row highlight sync

Header:
- Avatar → `/profile` yoki `/auth`
- Qidiruv stub → `/map` ga yo‘naltirish
- Bell + unread badge (login + prefs bo‘yicha)

Notifications unread (header):
- `fetchNotifications` + `unreadNotificationCount(notifications, prefs)`
- Faqat `areNotificationAlertsEnabled(prefs)` bo‘lsa query ishlaydi

─── D2. XARITA `/map` (MapView) ───

Geo status machine: `idle | loading | granted | fallback | denied`
- `RadiusSelector` — radius km (default 5)
- Tab: `salons` | `barbers`
- `GET /api/v1/salons/nearby/` va `GET /api/v1/barbers/nearby/`
- Barber map: `mapBarberNearby` — `booking_kind` salon/independent, `salon_id`, rating, services
- `hasMapCoords` filter — 0,0 koordinatalarni chiqarib tashlash
- Kartalar: `SalonCardPremium`, `BarberCardPremium`
- Barber bosilganda: independent → `/booking/barber/$id`, salon → `/salon/$salonId` yoki booking

─── D3. SALON DETAIL `/salon/$id` (SalonPage) ───

API:
- `GET /api/v1/salons/{id}/` — detail, services, images, hours, languages, premium
- `GET /api/v1/salons/{id}/staff/` — barberlar
- `GET /api/v1/reviews/?salon={id}` — sharhlar
- `GET /api/v1/salons/{id}/portfolio/` — portfolio rasmlar
- Favorites (login): `GET/POST /api/v1/favorites/salons/`, `DELETE .../{salon_id}/`
- Local cache: `isFavoriteSalon`, `setFavoriteSalon`, `fetchFavoriteSalonIds`

Tabs: about | services | staff | reviews
- Ish vaqti: `WEEKDAY_UZ` bilan weekday map
- CTA: "Band qilish" → `/booking/$salonId`
- Share, telefon, manzil, til, premium badge
- `RatingStars`, `formatSom`, `mediaSrc` + placeholders

─── D4. SALON BOOKING `/booking/$salonId` (BookingFlow) ───

Auth guard: token yo‘q → `router.replace(/auth?next=/booking/{id})`

4 qadamli wizard (`Step 1|2|3|4`):
1. Sartarosh tanlash — `GET /api/v1/salons/{id}/staff/`
2. Xizmatlar — `visibleServices` = services where `barber==null OR barber===selectedBarber`
   - Multi-select `selectedServices[]`
   - `totalDuration`, `totalPrice` real-time hisob
3. Sana + slot — `GET /api/v1/bookings/availability/?salon=&barber=&date=&service_ids=`
   - `minDate` = bugun
   - Slot grid 3 ustun
   - Xizmat/sana/barber o‘zgarsa `selectedTime` reset
4. Tasdiqlash + POST

Telefon validatsiya:
- `GET /api/v1/users/me/` — `phoneOk` = phone trim bo‘sh emas
- `!phoneOk` → banner + Profil link, submit disabled

POST booking:
```json
{ "salon": id, "barber": id, "start_at": ISO, "service_ids": [numbers] }
```
`start_at` = local Date(y,m,d,hh,mm) → toISOString()

Success flow:
1. toast: "Bron so‘rovi yuborildi" (pending holat)
2. `POST /api/v1/chat/conversations/` body `{ barber_id }`
3. OK → `/chat/{id}`, fail → toast warning → `/bookings`

─── D5. MUSTAQIL BARBER BOOKING `/booking/barber/$barberId` ───

Auth guard: xuddi salon flow

`fetchBarberPublicDetailByBarberId` → `GET /api/v1/barbers/by-barber-id/`
- `activeServices` = `is_active` filter
- 4 qadam: profil preview → xizmatlar → sana/slot → tasdiqlash

Slotlar:
- `GET /api/v1/barbers/availability/?barber=&date=&barber_service_ids=`
- useEffect + alive flag pattern

POST:
```json
{ "barber": number, "start_at": ISO, "barber_service_ids": [...] }
```
Success: chat create + redirect (salon flow bilan bir xil)

─── D6. BANDLARIM `/bookings` (MyBookings) ───

`AuthGate` wrapper
`GET /api/v1/bookings/` — list unwrap (`results` yoki array)

Tab filtri:
- `upcoming`: status in pending, accepted, in_progress
- `history`: completed, rejected, cancelled

Lifecycle UI:
- Steps: Kutmoqda → Tasdiq → Jarayon → Tugadi
- `lifecycleIndex(status)` — cancelled/rejected → -1 (alohida ko‘rinish)

Actions:
- `POST /api/v1/bookings/{id}/cancel/` — faqat upcoming
- Chat: `POST /api/v1/chat/conversations/` → `/chat/{id}`
- Review (completed, !has_review): `POST /api/v1/reviews/` { booking, rating, text }
- `StatusBadge` — pending|accepted|in_progress|completed|rejected|cancelled

─── D7. CHAT ───

ChatList: `GET /api/v1/chat/conversations/`

ChatThread:
- `GET /api/v1/chat/conversations/{id}/messages/`
- `POST .../messages/` — yuborish
- WebSocket: `WS /ws/chat/{conversationId}/?token=...` — live yangilanish

─── D8. BILDIRISHNOMALAR `/notifications` ───

`GET /api/v1/notifications/`
`POST /api/v1/notifications/{id}/read/`
`POST /api/v1/notifications/mark-all-read/`

Prefs filtri:
- `filterNotificationsByPrefs` — `chat_message` → chatAlerts; qolgani → bookingReminders
- `unreadNotificationCount` — prefs + read_at

Deep link algoritmi `targetFor(payload)`:
- `conversation_id` string → `/chat/{id}`
- `booking_id` → `/bookings`
- boshqacha → null

Icon map: reminder_1h, booking_accepted, booking_done, booking_pending, booking_rejected, booking_cancelled, booking_started, chat_message, ...

Alerts o‘chirilgan: Settings’dan — empty state + yo‘riqnoma

WS (layout): `useUserNotificationWs` — token bilan `notificationWebSocketUrl`, message → invalidate `["notifications"]`

─── D9. PROFIL `/profile` ───

`GET /api/v1/users/me/`
`PATCH /api/v1/users/me/` — full_name, phone, region
`GET /api/v1/regions/` — viloyat select
Counts: bookings, reviews (?mine=1), favorites

Role logic:
- `USER` — oddiy mijoz
- `BARBER_OWNER` / `BARBER_STAFF` — mijoz flow + **faqat** `barberWebUrl()` orqali barber panel banner (management EMAS)
- Logout: `clearTokens` + redirect

Menu: Band tarixi, Sharhlar, Sevimlilar, Maxfiylik, Yordam, Sozlamalar
`PwaInstallGuide` komponenti

─── D10. AUTH `/auth` (UserAuth) ───

Login: `POST /api/v1/auth/token/` → `setTokens`
Register: `POST /api/v1/auth/register/` — email, password, full_name, phone, region
`next` query — faqat `/` bilan boshlangan path
i18n: `userAuthMessages[locale]`
Barber akkaunt: `barberWebUrl("/auth")` link — users app emas
LanguageSwitcher

─── D11. SEVIMLILAR `/favorites` ───

`GET /api/v1/favorites/salons/`
`GET /api/v1/salons/?ids=1,2,3` — batch detail
DELETE favorite per salon

─── D12. SOZLAMALAR `/settings` ───

Local preferences (`localStorage` key: `mybarber_user_preferences`):
```ts
{ bookingReminders: boolean, chatAlerts: boolean, reduceMotion: boolean }
```
- `applyReduceMotion` → `document.documentElement.classList.toggle("reduce-motion")`
- `UserPreferencesInit` — layoutda init
- Event: `mybarber-user-prefs-changed`

─── D13. BOSHQA ───

- `AuthGate` — token yo‘q → `/auth?next=currentPath`
- `PwaInstallHint` — native shell detect, install guide
- `mediaSrc`, `PLACEHOLDER_AVATAR`, `PLACEHOLDER_SALON`
- Bottom nav badge: notifications unread (prefs-aware)

═══════════════════════════════════════════════════════════════════════════════
E. API CONTRACT (TO‘LIQ — FAQAT /api/v1)
═══════════════════════════════════════════════════════════════════════════════

Auth: POST /auth/token/, POST /auth/register/
User: GET|PATCH /users/me/
Regions: GET /regions/
Salons: GET /salons/, GET /salons/{id}/, GET /salons/{id}/staff/, GET /salons/{id}/portfolio/, GET /salons/nearby/, GET /salons/?ids=
Barbers: GET /barbers/nearby/, GET /barbers/by-barber-id/, GET /barbers/availability/
Bookings: GET /bookings/, POST /bookings/, GET /bookings/availability/, POST /bookings/{id}/cancel/
Reviews: GET /reviews/?salon=, GET /reviews/?mine=1, POST /reviews/
Favorites: GET|POST /favorites/salons/, DELETE /favorites/salons/{salon_id}/
Notifications: GET /notifications/, POST /notifications/{id}/read/, POST /notifications/mark-all-read/
Chat: GET|POST /chat/conversations/, GET|POST /chat/conversations/{id}/messages/
WS: /ws/chat/{id}/?token=, /ws/notifications/?token=

═══════════════════════════════════════════════════════════════════════════════
F. DOMAIN CHEGARASI (MUHIM)
═══════════════════════════════════════════════════════════════════════════════

Users app = CUSTOMER only:
✅ discover, map, salon detail, booking, bookings list, chat, notifications, profile, favorites
❌ barber membership accept/decline, worker tasdiqlash, salon admin CRUD
❌ admin panel endpointlari

Barber rollari users app’da:
- Mijoz sifatida bron qilish mumkin
- Boshqaruv faqat `barberWebUrl()` deep-link

═══════════════════════════════════════════════════════════════════════════════
G. EKRANLAR BO‘YICHA DIZAYN VAZIFALARI (YANGI UI)
═══════════════════════════════════════════════════════════════════════════════

Har bir ekran uchun yangi layout taklif qil, lekin D bo‘limidagi logikani saqla:

1. **Home `/`** — Full-bleed map, frosted header, draggable sheet with category chips + salon cards, skeleton loading, empty state
2. **Map `/map`** — Radius control, salon/barber toggle, map pins + bottom card carousel
3. **Salon** — Hero cover, sticky CTA "Band qilish", tabbed content, favorite heart animation
4. **Booking wizards** — Step indicator, sticky summary bar (price + duration), slot grid, success celebration
5. **Bookings** — Segmented control upcoming/history, lifecycle stepper, swipe-friendly actions
6. **Chat** — Modern messenger bubbles, date separators, composer sticky bottom
7. **Notifications** — Grouped by day, unread dot, mark all read, tap → deep link
8. **Profile** — Avatar hero, stats row, menu list with icons, edit inline sheet
9. **Auth** — Clean split branding, password visibility toggle, region picker
10. **Bottom nav** — 6 items, glass dock, active pill indicator, badge on Bell

Komponentlar qayta ishlatish:
- `components/luxury/*` — yangilash yoki almashtirish mumkin
- `components/ui/*` — shadcn primitives saqlanadi
- Yangi dizayn tokenlari faqat `styles.css` da

═══════════════════════════════════════════════════════════════════════════════
H. TEXNIK QABUL QILISH KRITERIYALARI
═══════════════════════════════════════════════════════════════════════════════

- `npm run build:user` — xatosiz
- `FLOW_REGRESSION_CHECKLIST.md` — barcha punktlar
- Customer UI’da barber-only API chaqiriqlari yo‘q
- Barcha clickable: `cursor-pointer`, `focus-visible:ring-2`
- `prefers-reduced-motion` + user `reduceMotion` pref
- Safe area: `pt-safe`, `env(safe-area-inset-bottom)`
- Emojilar yo‘q; Lucide only

═══════════════════════════════════════════════════════════════════════════════
I. AGENT CHIQISH FORMATI
═══════════════════════════════════════════════════════════════════════════════

1. **Design system summary** — ranglar, tipografiya, spacing, komponentlar ro‘yxati
2. **Screen wireframe notes** — har bir route uchun (qisqa)
3. **Implementation plan** — fayllar ro‘yxati, tartib
4. **Code changes** — patch
5. **What preserved** — qaysi algoritmlar o‘zgarmadi
6. **Verify checklist** — copy-paste test steps
7. **Open risks**

Boshlash: avval `styles.css` tokenlarni yangilab, keyin `UserLayout` + `UserBottomNav`, so‘ng sahifalar tartibida (`/` → map → salon → booking → ...).
```

---

## Qisqa foydalanish

| Maqsad | Qayerdan nusxa olish |
|--------|----------------------|
| To‘liq redesign + implementatsiya | Yuqoridagi `MASTER PROMPT` bloki |
| Faqat API/flow (eski UI saqlanadi) | `UI_IMPLEMENTATION_PROMPT.md` |
| Smoke test | `FLOW_REGRESSION_CHECKLIST.md` |

---

*Yaratilgan: barcha `apps/user` route, API, WS, prefs, booking/geo/sheet algoritmlari jamlangan master prompt.*
