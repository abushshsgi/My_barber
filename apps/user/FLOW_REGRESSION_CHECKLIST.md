# Users App Regression Checklist

`apps/user` uchun API va role-boundary regressiya checklist.

## 1) Auth va session

- `/auth` da login va register ishlaydi.
- Login qilingandan keyin `/profile` va `/bookings` endpointlari 401 bermaydi.
- Logout tokenlarni tozalab, qayta protected flowga kirganda authga qaytaradi.

## 2) Discover flow

- `/` da salon va barber listlari keladi.
- `/map` da `nearby` endpointlar ishlaydi.
- `/salon/{id}` detail sahifasi ochiladi.
- Salon detailda `staff`, `reviews`, va `portfolio` bloklari to'g'ri render bo'ladi.

## 3) Booking flow

- `/booking/{salonId}` slotlar yuklanadi va booking yaratiladi.
- `/booking/barber/{barberId}` independent booking ishlaydi.
- `/bookings` da yaratilgan bookinglar ko'rinadi.

## 4) Chat va notifications

- Bookingdan chat ochilganda conversation yaratiladi.
- `ChatThread` ichida message yuborish va real-time yangilanish ishlaydi.
- `/notifications` list ishlaydi, single read ishlaydi, `mark-all-read` ishlaydi.
- `UserLayout` sabab notification websocket query invalidation ishga tushadi.

## 5) Role boundary (muqim qoidalar)

- Users app ichida barber management mutationlari bo'lmasligi kerak.
- `BARBER_*` role userlar uchun faqat barber panelga redirect/entry CTA qoladi.
- Users app sahifalari customer booking flowga noto'g'ri link bermasligi kerak.

## 6) API contract

- Barcha users API chaqiriqlari `/api/v1` prefiksi bilan.
- Client va backend route nomlari mismatch bo'lmasa.
- 4xx/5xx holatlarda UI fallback matnlari ko'rinadi va sahifa yiqilmaydi.
