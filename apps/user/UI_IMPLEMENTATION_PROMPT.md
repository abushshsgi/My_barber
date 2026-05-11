# Users app — produksiya UI/implementation prompt

Bu hujjatni **butun blok** sifatida (yoki bo‘limma-bo‘lim) boshqa AI yoki dasturchiga berishingiz mumkin. Maqsad: `apps/user` mijoz ilovasini **real API**, **toza arxitektura** va **yuqori UI sifati** bilan productionga tayyorlash.

---

## 1) Bir galda beriladigan “master prompt” (copy–paste)

Quyidagi blokni o‘zgartirmasdan yuborishingiz mumkin (loyiha yo‘li sizda boshqacha bo‘lsa, faqat root’ni tuzating):

```
Sen senior frontend engineer sifatida Mybarber monoreposida ishlayapsan.

Kontekst:
- apps/user — mijoz (customer) ilova: Vite + React 18, TanStack Router, TanStack Query, Tailwind v4, Framer Motion, shadcn-ga o‘xshash components/ui, @mybarber/shared orqali API.
- apps/barber — barber panel (owner / employee / mybarber / independent flowlar).
- packages/shared — api.ts, salon-queries, barber-queries, ws-url, public-urls.
- backend — Django REST + WebSocket (/api/v1 canonical; /api duplicate mount bo‘lishi mumkin).

Vazifa:
1) apps/user dagi BARCHA mijoz flowlarini backend bilan izchil qilib yakunlash: discover, salon detail, booking (salon + mustaqil barber), bandlar ro‘yxati, chat, notifications, profile/auth.
2) Customer ilova ichida BARBER management (membership accept/decline worker, jamoa tasdiqlash va h.k.) bo‘lmasin — faqat mijozga tegishli actionlar. Barber rollari: faqat yo‘naltirish / barberWebUrl orqali panelga ulanish.
3) API chaqiriqlari faqat /api/v1 prefiksi bilan; legacy /api faqat majburiy bo‘lsa va izoh bilan.
4) Mavjud dizayn tili: qorong‘i fon, accent (teal/gold-gradient), rounded-2xl, floating nav-dock, Lucide ikonalar. Yangi “boshqa brend” UI qilma — mavjud komponentlar va tokenlarni kengaytir.
5) UI sifati: emojini UI ikona sifatida ishlatma; barcha bosiladigan elementlarda cursor-pointer va focus ring; loading/error/empty holatlari aniq; prefers-reduced-motion e’tiborga olinadi.
6) Chiqish: qisqa “What changed / Why / API matrix / Risks / Verify checklist”; faqat kerakli fayllarga patch; dead hook va unused export qoldirma.

Boshlashdan oldin: apps/user/STRUCTURE_OVERVIEW.md, apps/user/API_STATUS_MATRIX.md, apps/user/FLOW_REGRESSION_CHECKLIST.md ni o‘qib, keyin kod o‘zgartir.

Definition of done: npm run build:user o‘tadi; asosiy flowlar 404/503siz ishlaydi; customer UI da barber-only endpoint chaqiriqlari yo‘q.
```

---

## 2) Loyihaning qisqa xaritasi (agent uchun)

| Qatlam | Yo‘l |
|--------|------|
| User ilova | `apps/user/src/` |
| Sahifalar | `apps/user/src/page-views/` |
| Router | `apps/user/src/routes/` |
| Layout / nav | `apps/user/src/components/UserLayout.tsx`, `UserBottomNav.tsx` |
| API client | `packages/shared/src/api.ts` (alias `@/lib/api`) |
| WS | `packages/shared/src/ws-url.ts`, `useUserNotificationWs` |
| Barber deep-link | `packages/shared/src/public-urls.ts` — `barberWebUrl()` |
| Backend URL | `VITE_API_URL` / `NEXT_PUBLIC_API_URL` (shared api o‘qiydi) |

---

## 3) Maqsad (outcome)

- Mijoz **muammosiz** salon/barber topadi, band qiladi, bandlarini ko‘radi, chat va xabarnomalardan foydalanadi.
- **Domain chegarasi** aniq: users app = customer; barber boshqaruvi = `apps/barber`.
- **Contract** barqaror: frontend `/api/v1` bilan backend `urls.py` dagi marshrutlar mos.

---

## 4) Qat’iy cheklovlar (must not)

- Users app’da barber-only POSTlar (masalan membership `accept_worker` / `decline_worker`) bo‘lmasin.
- Customer UI’da admin-only endpointlarni chaqirish yoki ko‘rsatish kerak emas.
- Katta “framework almashtirish” yoki butun dizaynni yangidan chizish — **yo‘q**; incremental yaxshilash.
- Emojilar kategoriya/CTA ikonasi sifatida — **yo‘q**; faqat `lucide-react`.
- Har bir interaktiv element: `cursor-pointer`, `focus-visible:ring-*`, logic hover (layout shift qilmasin).

---

## 5) UI / UX sifat barieri (checklist)

**Vizual**

- [ ] Typography ierarxiyasi: sarlavha / sousarlavha / body aniq.
- [ ] Kartalar: `border-border/50`, hover’da yengil `accent` border yoki shadow; bir xil `rounded-2xl` ritmi.
- [ ] Pastki nav: floating dock (`nav-dock-surface`), safe-area, ikonalar `muted` / `accent`.
- [ ] Hero / list: bo‘sh va xato holatlari “husk” emas, matn + CTA bilan.

**Holatlar**

- [ ] Loading: skeleton yoki aniq loader; butun sahifani bloklamasdan mumkin.
- [ ] Error: foydalanuvchi tushunadigan xabar + qayta urinish (kerak bo‘lsa API base ko‘rsatish faqat dev/build da).
- [ ] Empty: izoh + keyingi qadam (masalan xarita yoki qidiruvni tozalash).

**A11y**

- [ ] Form va qidiruv uchun `label` / `aria-label`.
- [ ] `prefers-reduced-motion`: sahifa o‘tishlarida ortiqcha animatsiyani o‘chirish (loyihada `useReducedMotion` namunasi bor).

**I18n**

- [ ] Mavjud `locale-provider` va matnlar bilan ziddiyat chiqarma; yangi matnni ham i18n ga mos joylash (agar loyiha shunday tuzilgan bo‘lsa).

---

## 6) Screen-by-screen qabul qilish (acceptance)

**Auth**

- Login / register ishlaydi; `next` query bilan qaytish to‘g‘ri.
- Xato validatsiya va backend `detail` chiroyli chiqadi.

**Discover (/)**

- Salonlar va (tabda) barberlar ro‘yxati; qidiruv va (barberda) filtr sheet.
- Kategoriya chip’lari API filter bilan bog‘liq bo‘lsa, holat aniq ko‘rinadi.

**Map (/map)**

- Geolocation / nearby chaqiriqlar; xato holatida tushuntirish.

**Salon detail (/salon/$id)**

- Tafsilot, xizmatlar, staff, sharhlar, portfolio (agar backend qaytarsa).

**Booking**

- Salon: slotlar + yaratish.
- Mustaqil barber: availability + yaratish.
- Muvaffaqiyat/xato UX aniqligi.

**Bookings (/bookings)**

- Ro‘yxat va holatlar (backend modeliga mos).

**Chat**

- Ro‘yxat, thread, xabar yuborish; WS bilan yangilanish.

**Notifications**

- Ro‘yxat, bittasini o‘qilgan qilish, “hammasini o‘qilgan”; faqat mijozga mos CTA (barber tasdiqlash tugmalari emas).

**Profile**

- `users/me` ma’lumotlari; barber rollarida faqat **barber panelga o‘tish**, mijoz booking flowiga noto‘g‘ri link berilmasin.

---

## 7) API va contract (agent vazifasi)

Quyidagilarni doc yoki jadval shaklida yangilash:

- Har bir user ekrani: qaysi endpoint(lar) ishlatiladi — **fayl:qo‘ng‘iroq**.
- Status: `active` | `unwired` | `dead` | `legacy` | `wrong-domain`.
- Backend `backend/config/urls.py` bilan nomlash mosligi.

**Canonical:** barcha yangi kod `GET/POST /api/v1/...`

---

## 8) Role-boundary (UI qoidalari)

| Role (users/me) | Users app’da rufqa |
|-----------------|-------------------|
| `USER` | To‘liq mijoz flow |
| `BARBER_OWNER` / `BARBER_STAFF ` | Mijoz sifatida bron qilish mumkin, lekin **salon boshqaruvi** faqat `barberWebUrl` orqali |
| Backend’dagi `mybarber` / `independent` | Asosan barber app; users app’da faqat banner / link / copy |

---

## 9) Tekshiruv tartibi (runbook)

1. `npm run build:user`
2. Qo‘lda: `FLOW_REGRESSION_CHECKLIST.md` bo‘yicha smoke.
3. Rollar bilan: oddiy user + barber akkaunt (profilda noto‘g‘ri marshrut yo‘qligi).

---

## 10) Agent javob formati (majburiy)

Javob oxirida quyidagilar bo‘lsin:

1. **What changed** — qisqa ro‘yxat.
2. **Why** — mijoz/business sabab.
3. **API matrix** — jadval yoki ro‘yxat (yangilangan).
4. **Role-boundary** — nima qayerga ko‘chirildi yoki bloklandi.
5. **Verify** — copy-paste qilinadigan tekshiruv qadamlari.
6. **Open risks** — nima hali productionga tayyor emas.

---

## 11) Tezkor havola (repo ichida)

- [STRUCTURE_OVERVIEW.md](./STRUCTURE_OVERVIEW.md)
- [API_STATUS_MATRIX.md](./API_STATUS_MATRIX.md)
- [FLOW_REGRESSION_CHECKLIST.md](./FLOW_REGRESSION_CHECKLIST.md)

---

*Oxirgi yangilanish: prompt “master block”, acceptance criteria, UI quality bar va runbook bilan kengaytirildi.*
