# Users App Structure Overview

`apps/user` mijozlar uchun mo'ljallangan frontend ilova.

## Entry va Router

- `src/main.tsx` - ilova bootstrap va `RouterProvider`.
- `src/router.tsx` - `QueryClient` sozlamalari, root error handler.
- `src/routes/__root.tsx` - global providerlar (`QueryClientProvider`, `LocaleProvider`) va `UserLayout`.

## Route to Page Mapping

- `/` -> `src/page-views/Index.tsx`
- `/map` -> `src/page-views/MapView.tsx`
- `/salon/$id` -> `src/page-views/SalonPage.tsx`
- `/booking/$salonId` -> `src/page-views/BookingFlow.tsx`
- `/booking/barber/$barberId` -> `src/page-views/IndependentBookingFlow.tsx`
- `/bookings` -> `src/page-views/MyBookings.tsx`
- `/chat` -> `src/page-views/ChatList.tsx`
- `/chat/$id` -> `src/page-views/ChatThread.tsx`
- `/notifications` -> `src/page-views/Notifications.tsx`
- `/profile` -> `src/page-views/Profile.tsx`
- `/auth` -> `src/page-views/UserAuth.tsx`

## Layout va Shared UI

- `src/components/UserLayout.tsx` - page transition, bottom-nav, websocket invalidation integration.
- `src/components/UserBottomNav.tsx` - pastki navigatsiya.
- `src/components/ui/*` - shared UI primitive componentlar.

## API va Data Layer

- `@/lib/api` aliasi `packages/shared/src/api.ts` ga ulangan.
- Domain query helperlar:
  - `packages/shared/src/salon-queries.ts`
  - `packages/shared/src/barber-queries.ts`
- Map va media helperlar:
  - `packages/shared/src/mapSalon.ts`
  - `packages/shared/src/media.ts`

## Customer / Barber Boundary

- Users app customer flowlar uchun:
  - discover
  - booking
  - chat
  - notifications
  - profile
- Barber management actionlari users app ichida bajarilmaydi; barber panelga deep-link orqali o'tiladi.
