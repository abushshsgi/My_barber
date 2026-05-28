# User app (salon-connect + MyBarber UI)

Mijoz ilovasi **salon-connect** vendor kodiga asoslangan; `apps/salon-connect` submodule **o‘zgartirilmaydi**.

## Tuzilma

| Joy | Vazifa |
|-----|--------|
| [`../salon-connect/`](../salon-connect/) | To‘liq frontend (TanStack Start, mock/API) — faqat submodule yangilanishi |
| [`../../packages/user-ui/`](../../packages/user-ui/) | MyBarber neo-brutal UI komponentlari va `styles.css` |
| [`bridge/`](bridge/) | Vite alias, layout override, tema qo‘shimchasi |
| [`vite.config.ts`](vite.config.ts) | Dev/build: root = salon-connect, alias = bridge |
| [`_archive/pre-salon-connect/`](_archive/pre-salon-connect/) | Eski Django user ilova (reference) |

## Ishga tushirish

```bash
# Submodule (birinchi marta)
git submodule update --init apps/salon-connect

# Root
npm install
npm run dev:user
```

## Qoidalar

- `apps/salon-connect/**` ichida commit qilmang.
- Integratsiya faqat `bridge/` va `packages/user-ui/` orqali.
