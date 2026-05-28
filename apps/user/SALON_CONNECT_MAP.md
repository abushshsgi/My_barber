# salon-connect → MyBarber UI xaritasi

Vendor: [`apps/salon-connect`](../salon-connect/) (submodule, o‘zgartirilmaydi).  
UI: [`packages/user-ui`](../../packages/user-ui/).  
Bridge: [`apps/user/bridge`](bridge/).

## Router (salon-connect)

| Route | salon-connect fayl | MyBarber UI (reja / holat) |
|-------|-------------------|----------------------------|
| `/` | `routes/index.tsx` | Neo home — keyin `SalonCardPremium` |
| `/map` | `routes/map.tsx` | `DiscoveryMap`, `LuxuryMapView` |
| `/explore` | `routes/explore.tsx` | Qidiruv / katalog |
| `/salon/$id` | `routes/salon.$id.tsx` | Salon detail |
| `/booking/$salonId` | `routes/booking.$salonId.tsx` | Booking wizard |
| `/booking/barber/$barberId` | `routes/booking.barber.$barberId.tsx` | Independent booking |
| `/bookings` | `routes/bookings.tsx` | Bandlar ro‘yxati |
| `/chat`, `/chat/$id` | `routes/chat*.tsx` | Chat |
| `/notifications` | `routes/notifications.tsx` | Xabarlar |
| `/profile` | `routes/profile.tsx` | Profil |
| `/auth` | `routes/auth.tsx` | Auth |
| `/favorites` | `routes/favorites.tsx` | Sevimlilar |
| `/settings` | `routes/settings.tsx` | Sozlamalar |
| `/stylists` | `routes/stylists.tsx` | Barberlar |
| `/offers`, `/loyalty`, `/giftcard`, `/today`, `/support`, `/privacy` | mos route fayllar | Keyin skin |

## Bridge alias (amalda)

| salon-connect import | Bridge almashtirish |
|---------------------|---------------------|
| `src/styles.css` | `bridge/styles-entry.css` (salon + user-ui tema) |
| `src/components/UserLayout.tsx` | `bridge/overrides/UserLayout.tsx` → `MyBarberUserLayout` |
| `src/components/UserBottomNav.tsx` | `bridge/overrides/UserBottomNav.tsx` → `MyBarberUserBottomNav` |

## API (keyingi bosqich)

Hozir salon-connect: `lib/mock-data.ts`, `lib/api/example.functions.ts`.  
MyBarber Django `/api/v1` — alohida `packages/user-api-adapter` rejada.

## Eski MyBarber user (arxiv)

[`_archive/pre-salon-connect/src/page-views/`](_archive/pre-salon-connect/src/page-views/) — logika va API reference.
