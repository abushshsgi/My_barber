# Mysaloon — React Native (Expo)

Haqiqiy React Native ilova (`apps/user` Capacitor emas).

## Ishga tushirish

```bash
cd apps/mobile
npm start
```

## Auth

- Splash animatsiya → Login (Google + telefon OTP / parol) → Home
- Tokenlar: SecureStore / AsyncStorage (`mybarber_user_access`)
- Google: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` yoki `app.json` → `extra.googleClientId`
  (web OAuth client ID — backend `GOOGLE_OAUTH_CLIENT_ID` bilan mos)

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com npm start
```

## API

Default: `https://api.mysaloon.uz`  
Web dev: Metro proxy (`/api`, `/media`)

## Holat

- Home, Profil stack, Obuna, Login/Splash
- Auth Bearer + refresh ulangan
