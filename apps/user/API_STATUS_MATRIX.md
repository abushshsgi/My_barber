# Users App API Status Matrix

**Eslatma (2026-06):** Mijoz ilovasi — `apps/user/src/lib/api/` (canonical REST client).  
`packages/user-api-adapter` hali alohida paket emas — API shu papkada.

Canonical prefix: `/api/v1`

## Ulangan modullar (REST)

| Modul | Endpointlar | Frontend |
|-------|-------------|----------|
| Auth (telefon OTP) | `POST /auth/phone/*`, `POST /auth/token/refresh/` | `lib/api/auth.ts` |
| Profil | `GET/PATCH /users/me/` | `lib/api/user.ts`, `hooks/use-me.ts` |
| Salonlar | `GET /salons/`, nearby, search, staff, portfolio | `lib/api/salons.ts` |
| Sartaroshlar | `GET /barbers/nearby/`, find, by-barber-id, availability | `lib/api/barbers.ts` |
| Bronlar | `GET/POST /bookings/`, cancel, availability | `lib/api/bookings.ts` |
| Sharhlar | `GET/POST /reviews/` | `lib/api/reviews.ts` |
| Sevimlilar | `GET/POST/DELETE /favorites/salons/` | `lib/api/favorites.ts` |
| Bildirishnomalar | `GET /notifications/`, read, mark-all-read | `lib/api/notifications.ts` + WS |
| Chat | `GET/POST /chat/conversations/`, messages | `lib/api/chat.ts` + WS |
| Hamyon | `GET /wallet/me/`, transactions, top-up, gift | `lib/api/wallet.ts` |
| AI Stil | `POST /ai/style-analyze/`, try-on, face-check | `lib/api/ai.ts` |
| Yordam | `GET/POST /support/tickets/` | `lib/api/support.ts` |
| To'lov provayderlar | `GET /payments/providers/`, `POST /payments/checkout/` | `lib/api/payments.ts` |

## WebSocket (REDIS_URL production'da)

- `WS /ws/chat/{conversationId}/?token=...` — `hooks/use-chat-websocket.ts`
- `WS /ws/notifications/?token=...` — `hooks/use-notifications-websocket.ts`

## Hali mock / demo (backend yo'q)

`src/lib/mock-data.ts` dan foydalanadi: offers, loyalty, subscriptions, family, addresses, favorite-stylists, reels, stories, today (fake slotlar).

## Contract eslatmalari

- Backend `/api` va `/api/v1` parallel; frontend faqat `/api/v1`.
- SMS OTP provayderi hali ulanmagan — DEBUG rejimda kod ilovada ko'rinadi.
