# Users App UI Prompt (Production)

Sen senior frontend/fullstack engineer sifatida `Mybarber` monorepoda `apps/user` ilovasini production darajasiga olib chiqasan.

## Project context

- Monorepo:
  - `apps/user` - customer app
  - `apps/barber` - barber panel (owner/employee/mybarber/independent)
  - `apps/admin` - admin panel
  - `packages/shared` - API client, shared helpers, shared contracts
  - `backend` - Django REST + WebSocket API
- Router: TanStack Router
- Data fetching: TanStack Query
- UI: existing design system (`components/ui`) va hozirgi visual style saqlansin.

## Goal

`apps/user` UI ni real backend bilan to'liq ishlaydigan holatga keltir:
- customer flowlar mukammal ishlasin
- legacy/dead API usage yo'qolsin
- role-boundary aniq bo'lsin
- barber-management actionlari users app ichida bo'lmasin

## Strict constraints

- `apps/user` da faqat customer-domain actionlar bo'lsin.
- Barber management mutationlarini user app ichidan olib tashla.
- API endpointlar canonical: faqat `/api/v1`.
- Mavjud design system va navigation uslubidan chiqma.
- Katta refactor emas, incremental va safe patchlar qil.

## Required deliverables

1. `apps/user` architecture map:
   - route -> page-view mapping
   - layout ownership
   - shared API usage points
2. API status matrix:
   - active / dead / unwired / legacy
   - har bir endpoint uchun file reference
3. Backend-frontend mismatch report:
   - path mismatch
   - auth mismatch
   - payload mismatch
4. File-level patch plan:
   - qaysi faylda nima o'zgarishi aniq
5. Role-boundary qoidalari:
   - `USER`, `BARBER_OWNER`, `BARBER_STAFF` uchun UI behavior
6. Migration order + rollback:
   - har patchdan keyin qanday verify qilinadi
7. Test checklist:
   - auth -> discover -> booking -> chat -> notifications -> profile

## Role semantics (must preserve)

- `BARBER_OWNER`: salon egasi
- `BARBER_STAFF`: salonga qo'shilgan barber
- `mybarber`: barber app onboarding varianti
- `independent`: mustaqil barber profiling varianti

Eslatma: bular barber app semantikalari; users app’da bu holatlar faqat entry/redirect yoki informational ko'rinishda bo'lsin.

## Customer UX requirements

- Discover:
  - salon/barber list + map discover ishlashi
  - salon detailda review, staff, portfolio ko'rinishi
- Booking:
  - salon booking va independent booking ishlashi
  - booking history to'g'ri ko'rinishi
- Chat:
  - bookingdan chatga o'tish
  - realtime message update
- Notifications:
  - list, single mark-read, mark-all-read
  - customer-only rendering
- Profile:
  - user info, booking/review stats
  - barber role bo'lsa faqat barber panelga o'tish CTA

## Non-functional requirements

- Har xatolik holatida user-friendly fallback UI bo'lsin.
- Query invalidation strategiyasi aniq bo'lsin.
- Unused imports / dead hooks qolmasin.
- Lint va type errors paydo bo'lmasin.

## Output format from implementation agent

- `What changed`
- `Why changed`
- `API matrix table`
- `Role-boundary decisions`
- `Verification runbook`
- `Open risks`
