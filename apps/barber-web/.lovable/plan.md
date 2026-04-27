## Maqsad

Admin panelni "v2" darajasiga ko'tarish: Linear/Notion uslubidagi **command palette + ikki qatlamli sidebar** layout, har bir entity uchun **to'liq tahrir dialog**, **detail sahifalar**, va 6 ta yangi modul (Support, Services, Finance, Broadcast, Audit log, Activity log).

Hammasi mock data ustida ishlaydi (haqiqiy backend yo'q).

---

## 1. Yangi Layout — Linear uslubi

```text
┌──────┬──────────────┬─────────────────────────────────┐
│ ICON │ SUB-NAV      │  MAIN CONTENT                   │
│ rail │ (section     │  ┌─ topbar ──────────────────┐  │
│      │  ichidagi    │  │ breadcrumb · ⌘K · profile │  │
│ 56px │  pages)      │  └────────────────────────────┘  │
│      │ 220px        │                                  │
│      │              │  page body                       │
└──────┴──────────────┴─────────────────────────────────┘
```

- **Icon rail (56px)** — 6 ta asosiy bo'lim: Operations, Network, Catalog, Finance, Support, Settings. Har birida tooltip.
- **Sub-nav (220px)** — tanlangan section ichidagi sahifalar (masalan, Network → Salons / Barbers / Users / Reviews / Audit).
- **Topbar** — breadcrumb (`Network / Barbers / Aziz Karimov`), `⌘K` tugmasi, notifications bell, profile dropdown.
- **Cmd+K command palette** — global qidiruv: routes, entities (user/barber/salon ID bo'yicha), tezkor amallar ("Yangi salon yaratish", "Bronlarni eksport").

Mobile: icon rail + sub-nav birgalikda Sheet ichida ochiladi.

**Sections:**
- Operations: Dashboard, Bookings, Map
- Network: Salons, Barbers, Users, Reviews
- Catalog: Services, Categories
- Finance: Revenue, Payouts, Transactions
- Support: Tickets, Broadcast (Notifications)
- Settings: Audit log, Admins, Profile

---

## 2. Yangi sahifalar

### Detail pages (har bir entity uchun)
- `/admin/users/$userId` — profil, bronlar tarixi, sharhlar, faollik (timeline), tahrir tugmasi
- `/admin/barbers/$barberId` — profil, joylashuv map, bronlar, sharhlar, daromad statistikasi, salon biriktirish
- `/admin/salons/$salonId` — info, sartaroshlar ro'yxati, bronlar, daromad, joylashuv, gallery (mock)
- `/admin/bookings/$bookingId` — booking detali, status timeline, mijoz/sartarosh kartochkalari, qaytarish/bekor qilish

### Support modul
- `/admin/support` — ticket ro'yxati (open/pending/resolved, prioritet, kategoriya bo'yicha filter)
- `/admin/support/$ticketId` — chat-style reply thread, status o'zgartirish, biriktirish (assign to admin)

### Catalog modul
- `/admin/services` — xizmatlar CRUD (nom, narx, davomiyligi, kategoriya, faol/nofaol)
- `/admin/categories` — kategoriyalar CRUD (nom, ikonka, tartib)

### Finance modul
- `/admin/finance` — daromad dashboard (haftalik/oylik chart, top sartaroshlar, hudud bo'yicha taqsimot)
- `/admin/finance/payouts` — sartaroshlarga to'lovlar (pending/paid/failed, eksport)
- `/admin/finance/transactions` — barcha tranzaksiyalar log (booking → payment → commission → payout)

### Notifications
- `/admin/broadcast` — xabar yuborish (audience: all / region / role), tarix, statistika (yuborildi/o'qildi)

### Audit & Settings
- `/admin/audit` — admin amallari log (kim, qachon, nima o'zgartirdi, IP, before/after diff)
- `/admin/admins` — admin foydalanuvchilar (rollar: superadmin, moderator, finance, support)
- `/admin/profile` — admin o'zining profili

---

## 3. To'liq tahrir dialoglari

Har bir resurs uchun **EditDialog** komponenti (`react-hook-form` + `zod`):

- **EditUserDialog** — name, phone, email, region, avatar URL, is_active, izoh
- **EditBarberDialog** — name, avatar, phone, region, salon biriktirish (Select), lat/lng, rating override, is_active
- **EditSalonDialog** — name, address, region, lat/lng (map picker), published, telefon, ish vaqti, gallery URL
- **EditBookingDialog** — status, narx, vaqt, izoh
- **EditServiceDialog** — name, kategoriya, narx, davomiyligi (min), is_active
- **EditTicketDialog** — status, prioritet, assign

**+ Yangi qo'shish** — har bir ro'yxat ustida `+ New` tugma, xuddi shu dialogni `mode="create"` bilan ochadi.

---

## 4. Mock data kengaytmasi

`src/lib/mock-data.ts` ga qo'shiladi:
- `mockServices` (15 ta), `mockCategories` (6 ta)
- `mockTickets` (20 ta) + `mockTicketReplies`
- `mockTransactions` (100 ta), `mockPayouts` (30 ta)
- `mockBroadcasts` (10 ta)
- `mockAuditLog` (50 ta) — `{ admin, action, target, before, after, ts, ip }`
- `mockAdmins` (5 ta) + rollar
- `mockActivity` (har bir user/barber uchun timeline events)

`src/lib/mock-api.ts` ga mos CRUD funksiyalar (delay + in-memory store + invalidation).

---

## 5. Texnik detallar

**Yangi shadcn komponentlar (allaqachon mavjud):** dialog, command, tabs, popover, dropdown-menu, scroll-area, form, breadcrumb. Yangi paket o'rnatish shart emas (`react-hook-form`, `@hookform/resolvers` o'rnatiladi).

**Routing:**
- File-based, flat dot syntax: `admin.users.$userId.tsx`, `admin.support.$ticketId.tsx`, va h.k.
- Har bir route: `validateSearch` + `errorComponent` + `notFoundComponent`.
- `loaderDeps` faqat kerakli search paramlarni qaytaradi.

**State:**
- TanStack Query: `["admin", resource, params]` key konvensiyasi saqlanadi.
- Mutation `onSuccess` da tegishli queriesni invalidate qiladi + optimistic update bookings/status uchun.

**Cmd+K:**
- `cmdk` (shadcn `command` allaqachon ishlatadi). Global hotkey listener `useEffect` da.
- Static routes + dynamic search (mock-api dan top 10 natija).

**Layout files:**
- `src/components/admin/AdminShell.tsx` — yangi double sidebar shell (eski `AdminLayout` o'rnini bosadi)
- `src/components/admin/IconRail.tsx`, `SubNav.tsx`, `TopBar.tsx`, `CommandPalette.tsx`
- `src/components/admin/edit-dialogs/` — har bir EditXDialog
- `src/components/admin/DetailHeader.tsx`, `ActivityTimeline.tsx`, `StatTile.tsx`

**Theme:** mavjud bezhe/cream tema saqlanadi (`--background: oklch(0.972 ...)`).

---

## 6. Yetkazib berish bosqichlari

1. Mock data + API kengaytmasi (services, tickets, finance, audit, admins, activity)
2. Yangi `AdminShell` (icon rail + sub-nav + topbar + Cmd+K)
3. `react-hook-form` o'rnatish + barcha EditDialog komponentlari
4. Detail sahifalar (users / barbers / salons / bookings)
5. Catalog (services + categories)
6. Support tickets (list + detail + reply)
7. Finance (revenue + payouts + transactions)
8. Broadcast + Audit log + Admins + Profile
9. Mavjud list pagelarni yangilash: `+ New` tugma, har bir qatorga "Tahrirlash" amali, detail sahifaga link

---

## Eslatma

- Hammasi UI prototip — haqiqiy backend ishlatilmaydi.
- Cmd+K, tahrir dialoglari, status o'zgarishlari — barchasi mock-api ustida darhol ishlaydi (delay 280ms).
- Bulk actions va inline edit hozircha qo'shilmaydi (siz ulardan **Full edit dialog** ni tanladingiz). Keyin so'rasangiz — qo'shamiz.
