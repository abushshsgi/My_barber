# Mysaloon — React Native (Expo)

Haqiqiy React Native ilova (`apps/user` Capacitor emas). Home sahifa web mobil UI bilan bir xil.

## Ishga tushirish

```bash
cd apps/mobile
npm start
```

Keyin Expo Go (Android/iOS) yoki emulator.

## API

Default: `https://api.mysaloon.uz`

Override:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:8000 npm start
```

## Holat

- Home: header, banner, kategoriyalar, Top salonlar / Top ustalar, dock
- Katalog API ulangan (`/api/v1/salons/`, `/api/v1/barbers/`)
- Xarita, Morf AI, Explore, Profil — placeholder (keyingi sahifalar)

## Eslatma

Bu paket monorepo `workspaces` ichida emas — Expo React 19 va web React 18 konfliktini oldini olish uchun alohida `node_modules`.
