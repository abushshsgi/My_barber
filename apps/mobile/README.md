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

**Android client**: package `uz.mysaloon.mobile` + **har bir** imzo SHA-1
(Firebase → Project settings → Your apps → Android → Add fingerprint).

Majburiy fingerprintlar (Firebase `mysaloon-4227d`):
- **Debug** (`~/.android/debug.keystore`): `6A:C8:AA:16:92:35:32:E0:67:4F:91:32:24:A7:04:88:26:1F:3F:2B`
- **EAS production/preview APK**: `C1:C4:4C:6F:F9:EC:11:5B:39:AA:A8:90:7C:1F:FD:B3:D9:54:1F:FE`

SHA qo‘shilgach `google-services.json` ni qayta yuklab `apps/mobile/` ga qo‘ying va **yangi APK** build qiling.
SHA qo‘shilmasa native Google Sign-In `DEVELOPER_ERROR` / `ApiException: 10` beradi.

**Web client** (idToken): `EXPO_PUBLIC_GOOGLE_CLIENT_ID` va backend `GOOGLE_OAUTH_CLIENT_ID` — hozir:
`1080867624985-2c0i66qgdsaap0vqm0mickmk574h8cor.apps.googleusercontent.com`

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
