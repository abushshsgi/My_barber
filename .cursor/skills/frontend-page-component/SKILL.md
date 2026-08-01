---
name: frontend-page-component
description: apps/user, apps/admin va apps/barber ichida yangi sahifa (route) yoki UI komponent yaratish qoidalari — TanStack Router fayl-route nomlash, mobil/desktop split, shadcn/ui va Tailwind tokenlari, TanStack Query kalitlari, i18n va navigatsiya ro'yxatlarini yangilash. Use when adding a new page, route, screen, or React component to any frontend app (user, admin, barber), or when the user asks where a component should live.
---

# Frontend sahifa va komponent yaratish

Uchta frontend app mustaqil: `apps/user`, `apps/admin`, `apps/barber`. **Kod applar orasida ko'chirilmaydi** — har birining o'z `components/ui/`, o'z API klienti va o'z router'i bor.

## Ish jarayoni

Yangi sahifa qo'shayotganda shu ro'yxatni nusxalab, belgilab boring:

```
- [ ] 1. Qaysi app ekanini aniqlash va mavjud shunga o'xshash sahifani o'qish
- [ ] 2. src/routes/ ichida route fayli yaratish
- [ ] 3. Sahifa komponentini yozish (user'da: mobil + desktop)
- [ ] 4. Ma'lumot uchun query hook qo'shish
- [ ] 5. i18n kalitlari (faqat apps/user)
- [ ] 6. Navigatsiya / gate ro'yxatlarini yangilash
- [ ] 7. lint + build bilan tekshirish
```

## App xaritasi

| App | Workspace | Dev | Muhim farq |
|---|---|---|---|
| `apps/user` | `user-web` | `npm run dev:user` (3000) | TanStack **Start**, SSR. i18n bor. Mobil/desktop alohida daraxt |
| `apps/admin` | `admin-web` | `npm run dev:admin` (3001) | Oddiy Vite SPA. i18n **yo'q** — matnlar to'g'ridan-to'g'ri o'zbekcha. `framer-motion` yo'q |
| `apps/barber` | `tanstack_start_ts` | `npm run dev:barber` (3003) | Oddiy Vite SPA + PWA. i18n **yo'q** |

`apps/user/index.html` fayli **yaratilmaydi** — bo'lsa Vercel SSR o'rniga statik fayl beradi.

## 1. Route fayli

Uchala app ham TanStack Router'ning fayl-route'idan foydalanadi. `src/routeTree.gen.ts` **avtomatik generatsiya qilinadi** — qo'lda tahrirlanmaydi va route hech qayerda qo'lda ro'yxatga olinmaydi. Faylni yaratish kifoya, `dev`/`build` daraxtni o'zi qayta yozadi.

Nom nuqta bilan yoziladi, ichma-ich papka ochilmaydi:

| Fayl | URL |
|---|---|
| `apps/user/src/routes/index.tsx` | `/` |
| `apps/user/src/routes/salon.$id.tsx` | `/salon/:id` |
| `apps/user/src/routes/wallet_.top-up.tsx` | `/wallet/top-up`, lekin `/wallet` layout'idan chiqadi (`_` suffiks) |
| `apps/admin/src/routes/admin.barbers.$barberId.stats.index.tsx` | `/admin/barbers/:barberId/stats` |

Har bir fayl `Route` ni **eksport qiladi**, sahifa komponenti esa eksport qilinmaydi:

```tsx
export const Route = createFileRoute("/wallet/top-up")({
  head: () => ({ meta: [{ title: "Hisobni to'ldirish — mysaloon.uz" }] }),
  component: WalletTopUpPage,
});

function WalletTopUpPage() {
  ...
}
```

- `head()` faqat `apps/user` da ishlaydi (SSR meta). Admin va barber sarlavhani `index.html` dan oladi.
- Query params `validateSearch` bilan zod orqali tekshiriladi.
- `loader` ichida `context.queryClient.ensureQueryData(...)` bilan prefetch qilinadi — namuna: `apps/user/src/routes/salon.$id.tsx`.
- SSR muammo bersa route'ga `ssr: false` qo'yiladi (repoda bir nechta joyda React #423 oq ekran sababli shunday qilingan).
- `createLazyFileRoute` ishlatilmaydi. Og'ir komponent (masalan xarita) `React.lazy` + `Suspense` bilan yuklanadi.

## 2. Mobil va desktop (faqat `apps/user`)

Breakpoint — `lg` (1024px). Route komponenti ma'lumotni **bir marta** oladi va ikkita ko'rinishga uzatadi:

```tsx
function Home() {
  const data = useHomeData();
  return (
    <DesktopPageSplit mobile={<HomeVariantEditorial data={data} />} desktop={<HomeDesktopRoot data={data} />} />
  );
}
```

`apps/user/src/components/desktop/DesktopPageSplit.tsx` faqat aktiv breakpoint daraxtini mount qiladi — ikkalasini `lg:hidden` bilan yashirish xaritani ikki marta yaratib buzadi.

- Mobil komponent: `src/components/<feature>/` yoki `src/components/mobile/`. Sarlavha va orqaga tugmasi uchun `MobilePageShell` ishlatiladi.
- Desktop komponent: `src/components/desktop/pages/<Name>DesktopPage.tsx`.
- Header, dock va footer markazda — `apps/user/src/components/UserLayout.tsx`. Sahifa ularni o'zi chizmaydi.

Admin va barber bitta responsive shell bilan ishlaydi (`AdminShell`, `BarberShell`), split kerak emas.

## 3. Komponent qoidalari

- **Named function + named export.** `export function WalletDesktopPage({ section }: Props) {}`. Default export ishlatilmaydi (yagona istisno — `React.lazy` uchun `AdminMap2GIS`).
- **Fayl nomi:** app komponentlari PascalCase (`MobilePageShell.tsx`), shadcn primitivlari kebab-case (`components/ui/button.tsx`), hook va lib modullari kebab-case (`use-salon-page.ts`, `wallet-nav.ts`). Server-only modul `*.server.ts` bilan tugaydi.
- **Props:** komponent ustida lokal `type Props = { ... }`. Noaniq propga o'zbekcha JSDoc yoziladi:

```tsx
type Props = {
  title: string;
  /** Header ostida, sticky header ichida qoladigan qo'shimcha blok (masalan tablar). */
  headerExtra?: React.ReactNode;
};
```

- **Klasslar:** shartli klass har doim `cn()` orqali — `import { cn } from "@/lib/utils"`.
- **Tailwind v4**, `tailwind.config.js` yo'q. Ranglar semantik token bilan beriladi: `bg-background`, `text-muted-foreground`, `border-border`, `bg-card`. Xom rang (`bg-[#1a1a1a]`, `text-gray-500`) yozilmaydi. Tokenlar `src/styles.css` ichida.
- **shadcn/ui:** kerakli primitiv `src/components/ui/` da bormi — avval shuni tekshiring. Yangi primitiv o'sha appning `components.json` sozlamasi bilan qo'shiladi (`new-york`, `slate`, lucide ikonkalari).
- **Import aliasi** `@/*` → `./src/*`.
- **framer-motion** faqat `user` va `barber` da bor. Sahifa kirish animatsiyasi uchun `PageEnterMotion`; o'zingiz yozsangiz `useReducedMotion()` ni hurmat qiling.

Komponent `packages/` ga faqat sof mantiq yoki tip bo'lsa chiqariladi (`@mybarber/shared`), xarita esa `@mybarber/map-google` da. **UI komponent packages'ga chiqarilmaydi** — `packages/**` o'zgarsa uchala frontend qayta quriladi.

## 4. Ma'lumot olish

`QueryClient` `src/router.tsx` da yaratiladi va router context orqali beriladi. Komponent ichida `fetch` chaqirilmaydi — app klienti ishlatiladi:

| App | Klient | Endpoint funksiyalari |
|---|---|---|
| user | `src/lib/api/client.ts` (`apiFetch`, `apiJson`) | `src/lib/api/salons.ts`, `bookings.ts`, ... |
| admin | `src/lib/api.ts` | `src/lib/admin-api.ts` |
| barber | `src/lib/api.ts` | o'sha faylda |

Yo'llar `/api/v1/...` bilan boshlanadi va Django'ning oxirgi `/` belgisi saqlanadi.

Query hook `src/hooks/` da, domen bo'yicha bitta fayl:

```ts
export const salonsQueryKey = ["salons"] as const;

export function useSalonDetail(id: string) {
  return useQuery({
    queryKey: [...salonsQueryKey, "detail", id],
    queryFn: async () => mapSalonDetail(await fetchSalon(id)),
    enabled: catalogQueryEnabled(Boolean(id)),
    staleTime: 60_000,
  });
}
```

- User: baza kalit konstantasi + spread; `enabled` uchun `authQueryEnabled()` / `catalogQueryEnabled()` (`lib/auth-query.ts`); foydalanuvchiga bog'liq kesh uchun `userQueryKey()`; xom API javobi `lib/mappers/*` orqali o'giriladi.
- Barber: `barberQueryKeys` kalit-fabrikasi (`src/hooks/use-barber-queries.ts`).
- Admin: kalit inline massiv — `["admin", "categories"]`.

Mutatsiya + toast (sonner `<Toaster />` `__root.tsx` da bir marta ulangan):

```ts
const addCat = useMutation({
  mutationFn: () => createCategory({ name: name.trim() }),
  onSuccess: () => {
    void qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    toast.success("Kategoriya qo'shildi");
  },
  onError: (e: Error) => toast.error(e.message),
});
```

`apiJson` DRF xato tanasini o'qib `Error.message` qilib tashlaydi — shuning uchun `e.message` ni ko'rsatish kifoya.

## 5. i18n — faqat `apps/user`

Matn `t("...")` orqali chiqadi, JSX ichiga qattiq yozilmaydi:

```tsx
const { t } = useTranslation();
<h1>{t("wallet.topUp.title", { defaultValue: "Hisobni to'ldirish" })}</h1>;
```

Yangi kalit **uchala faylga** qo'shiladi: `apps/user/src/i18n/locales/uz.json`, `ru.json`, `en.json`. Kalit feature bo'yicha ichma-ich: `nav.home`, `wallet.topUp.title`, `salon.loginForFavorite`. Lazy chunk ichida `useAppTranslation()` ishlatiladi.

Admin va barber'da i18n yo'q — matn to'g'ridan-to'g'ri o'zbekcha yoziladi (`"Bronlar"`, `"Qayta urinish"`).

## 6. Sahifani ro'yxatlarga qo'shish

Route fayli URL'ni ishga tushiradi, lekin sahifa navigatsiyada ko'rinishi va gate'lardan o'tishi uchun quyidagilar yangilanadi:

**user**
- `src/lib/auth-routes.ts` — `AUTH_REQUIRED_PREFIXES` (login talab qilinsa)
- `src/lib/layout-routes.ts` — `shouldShowMobileDock`, `showsSiteFooter`, desktop kengligi uchun `DISCOVERY_EXACT` / `STANDARD_PREFIX`, va `getPageTitleKey`
- `src/components/mobile/MobileDockNav.tsx` — pastki dock tabi kerak bo'lsa

**admin**
- `src/components/admin/AdminShell.tsx` — sidebar massivi: `{ to: "/admin/bookings", label: "Bronlar", icon: CalendarClock }`

**barber**
- `src/components/barber/BarberShell.tsx` — `nav` massivi
- `src/lib/barber-activation-gate.ts` va `src/lib/shop-subscription.ts` — sahifa aktivatsiyadan oldin yoki obunasiz ochilishi kerak bo'lsa

## 7. Tekshirish

Faqat o'zgargan appni tekshiring:

```bash
npm run lint -w user-web      # yoki admin-web / tanstack_start_ts
npm run build:user            # yoki build:admin / build:barber
```

`npm run build:frontends` deploy uchun ishlatilmaydi. Deploy tartibi uchun `deploy-changed-app` skilliga qarang.

Prettier: `printWidth: 100`, qo'sh qo'shtirnoq, nuqtali vergul, `trailingComma: "all"` — `npm run format -w <workspace>`.

## Taqiqlar

- `routeTree.gen.ts` ni tahrirlash
- `apps/user/index.html` yaratish
- Bir appning komponentini ikkinchisiga nusxalash o'rniga uni `packages/` ga ko'chirmasdan import qilish
- Xom rang klasslari va inline `fetch`
- `apps/user` da tarjimasiz qattiq matn
