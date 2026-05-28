# Users App API Status Matrix

**Eslatma (2026):** Mijoz ilovasi — faqat [`apps/salon-connect`](../salon-connect/) UI (submodule).  
Hozirgi ma'lumot: salon-connect `lib/mock-data.ts`. Quyidagi Django endpointlar **keyin** ulanadi.

Canonical prefix (MyBarber backend): `/api/v1`

## Rejadagi endpointlar (MyBarber backend)

- `POST /auth/token/` — login
- `POST /auth/register/` — register (`region` bilan)
- `GET /regions/` — viloyat tanlovi
- `GET /users/me/` — profile
- `PATCH /users/me/` — profil yangilash
- `GET /salons/` — salon list
- `GET /salons/?ids=1,2,3` — sevimli salonlar batch
- `GET /salons/{id}/` — salon detail
- `GET /salons/{id}/staff/` — salon barberlari
- `GET /salons/{id}/portfolio/` — portfolio
- `GET /salons/nearby/` — map discover
- `GET /salons/search/?q=` — salon qidiruv
- `GET /barbers/nearby/` — nearby barber
- `GET /barbers/find/?q=` — barber qidiruv
- `GET /barbers/by-barber-id/` — independent detail
- `GET /barbers/availability/` — independent slotlar
- `GET /bookings/availability/` — salon slotlar
- `GET /bookings/` — booking history
- `POST /bookings/` — booking create
- `POST /bookings/{id}/cancel/` — bekor qilish
- `GET /reviews/?salon={id}` — salon reviews
- `GET /reviews/?mine=1` — user reviews
- `POST /reviews/` — sharh yozish
- `GET /favorites/salons/` — sevimlilar
- `POST /favorites/salons/` — qo'shish
- `DELETE /favorites/salons/{salon_id}/` — olib tashlash
- `GET /notifications/` — notifications
- `POST /notifications/{id}/read/` — o'qilgan
- `POST /notifications/mark-all-read/` — hammasi
- `GET /chat/conversations/` — chat list
- `POST /chat/conversations/` — yangi chat
- `GET /chat/conversations/{id}/messages/` — thread
- `POST /chat/conversations/{id}/messages/` — xabar yuborish

## WebSocket (reja)

- `WS /ws/chat/{conversationId}/?token=...`
- `WS /ws/notifications/?token=...`

## Contract risklar

- Backendda `/api` va `/api/v1` parallel; frontendda faqat `/api/v1`.
- API adapter: `packages/user-api-adapter` (hali yozilmagan).
