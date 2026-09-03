# Mysaloon — React Native (Expo)

Haqiqiy React Native (Expo) ilova. Web frontendlardan alohida.

## Ishga tushirish

```bash
cd apps/mobile
npm start
```

## Auth

- Splash animatsiya → Login (Google + telefon OTP / parol) → Home
- Tokenlar: SecureStore / AsyncStorage (`mybarber_user_access`)
- Google: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` — **Web** OAuth client ID (`client_type: 3`).
  Native Android/iOS da `@react-native-google-signin/google-signin` tizim hisoblar
  oynasini ochadi (brauzer emas). Android client (package + SHA-1) `google-services.json`
  orqali avtomatik. Backend `GOOGLE_OAUTH_CLIENT_ID` ham Web client bilan mos bo‘lsin.
  Native modul o‘zgarganda **yangi APK/dev build** kerak (`eas build` yoki `npx expo run:android`).

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com npm start
```

### Google Console

**Android client** (mavjud): package `uz.mysaloon.app` + APK imzolovchi SHA-1
(EAS credentials / debug keystore).

**Web client** (idToken): `EXPO_PUBLIC_GOOGLE_CLIENT_ID` va backend audience.

Web/dev redirect (faqat web login):
- origins: `http://localhost:8081`
- redirect: `http://localhost:8081`, `mysaloon://`
## API

Default: `https://api.mysaloon.uz`  
Web dev: Metro proxy (`/api`, `/media`)

## APK (Android)

Expo cloud orqali APK:

```bash
cd apps/mobile
npm i -g eas-cli
eas login
eas build:configure   # birinchi marta — Expo project bog'lash
npm run build:apk      # preview APK
```

Build tugagach Expo saytda **Download** chiqadi — APK ni telefonga yuklab o'rnating.

Play Store uchun AAB:

```bash
npm run build:aab
```

**Muhim:** `.env` dagi `EXPO_PUBLIC_*` qiymatlar cloud buildga avtomatik kirmaydi. EAS secrets:

```bash
eas secret:create --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "...." --scope project
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "...." --scope project
```

Yoki `eas.json` `env` bo'limiga yoziladi (maxfiy kalitlarni gitga qo'ymang).
