# Users App API Status Matrix

**Eslatma (2026):** Mijoz ilovasi endi [`apps/salon-connect`](../salon-connect/) (vendor submodule) + [`packages/user-ui`](../../packages/user-ui/) + [`bridge/`](bridge/).  
Hozirgi ma’lumot manbai: salon-connect `lib/mock-data.ts` (Django `/api/v1` keyin ulash rejasida).  
Arxiv (Django user): [`_archive/pre-salon-connect/`](_archive/pre-salon-connect/).

Canonical prefix (MyBarber backend — keyin): `/api/v1`

## Active va ishlab turgan endpointlar

- `POST /auth/token/` - login (`UserAuth.tsx`)
- `POST /auth/register/` - register (`UserAuth.tsx`, `region` bilan)
- `GET /regions/` - signup/profile viloyat tanlovi (`UserAuth.tsx`, `Profile.tsx`)
- `GET /users/me/` - profile (`Profile.tsx`, booking flowlar)
- `PATCH /users/me/` - ism, telefon va viloyat yangilash (`Profile.tsx`)
- `GET /salons/` - salon list (`Index.tsx` orqali shared query)
- `GET /salons/?ids=1,2,3` - sevimli salonlar batch (`Favorites.tsx`)
- `GET /salons/{id}/` - salon detail (`SalonPage.tsx`, `BookingFlow.tsx`)
- `GET /salons/{id}/staff/` - salon barberlari (`SalonPage.tsx`, `BookingFlow.tsx`)
- `GET /salons/{id}/portfolio/` - salon ish natijalari (`SalonPage.tsx`)
- `GET /salons/nearby/` - map discover (`MapView.tsx`)
- `GET /salons/search/?q=` - salon nomi qidiruv (`Search.tsx`, `salon-queries.searchSalons`)
- `GET /barbers/nearby/` - nearby barber (`MapView.tsx`)
- `GET /barbers/find/?q=` - sartarosh ismi qidiruv (`Search.tsx`, `barber-queries.findBarbers`)
- `GET /barbers/by-barber-id/` - independent detail (`IndependentBookingFlow.tsx`)
- `GET /barbers/availability/` - independent slotlar (`IndependentBookingFlow.tsx`)
- `GET /bookings/availability/` - salon booking slotlari (`BookingFlow.tsx`)
- `GET /bookings/` - booking history (`MyBookings.tsx`, `Profile.tsx`)
- `POST /bookings/` - booking create (`BookingFlow.tsx`, `IndependentBookingFlow.tsx`)
- `POST /bookings/{id}/cancel/` - booking bekor qilish (`MyBookings.tsx`)
- `GET /reviews/?salon={id}` - salon reviews (`SalonPage.tsx`)
- `GET /reviews/?mine=1` - user reviews (`Profile.tsx`)
- `POST /reviews/` - tugagan booking uchun sharh (`MyBookings.tsx`)
- `GET /favorites/salons/` - sevimli salonlar (`Favorites.tsx`, `Profile.tsx`, `SalonPage.tsx`)
- `POST /favorites/salons/` - salonni sevimliga qo'shish (`SalonPage.tsx`)
- `DELETE /favorites/salons/{salon_id}/` - sevimlidan olib tashlash (`Favorites.tsx`, `SalonPage.tsx`)
- `GET /notifications/` - notifications list (`Notifications.tsx`)
- `POST /notifications/{id}/read/` - single read (`Notifications.tsx`)
- `POST /notifications/mark-all-read/` - bulk read (`Notifications.tsx`)
- `GET /chat/conversations/` - chat list (`ChatList.tsx`)
- `POST /chat/conversations/` - conversation create (`BookingFlow.tsx`, `IndependentBookingFlow.tsx`, `MyBookings.tsx`)
- `GET /chat/conversations/{id}/messages/` - thread load (`ChatThread.tsx`)
- `POST /chat/conversations/{id}/messages/` - send message (`ChatThread.tsx`)

## WebSocket

- `WS /ws/chat/{conversationId}/?token=...` - chat live updates.
- `WS /ws/notifications/?token=...` - notifications invalidation (`useUserNotificationWs` via `UserLayout`).

## Dead / Unwired / Legacy holatlar

- `apps/user` ichida barber-worker membership actionlari (`accept_worker`, `decline_worker`) olib tashlandi; bu flow barber panel domeniga tegishli.
- `packages/shared/src/salon-queries.ts` ichidagi users app tomonidan ishlatilmagan salon-join helperlar olib tashlandi (barber app local join flow ishlatadi).
- `notifications` sahifasida customer app uchun barber-management CTA lar chiqarib tashlandi.

## Contract risklar (monitoring)

- Backendda `/api` va `/api/v1` parallel turibdi; frontendda faqat `/api/v1` ishlatish tavsiya etiladi.
- Chat create faqat bookingdan keyin ishlaydi; booking flowlarda xato bo'lsa toast ko'rsatiladi va foydalanuvchi `Bandlarim` sahifasiga qaytariladi.
