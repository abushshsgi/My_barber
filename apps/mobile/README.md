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
- Google: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` yoki `app.json` → `extra.googleClientId`
  (**Web** OAuth client ID — `client_type: 3`. Android client ID (...tkfiilj...)
  AuthSession brauzer oqimida `400 invalid_request` beradi.)
  Backend `GOOGLE_OAUTH_CLIENT_ID` ham shu Web client bilan mos bo‘lsin.

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com npm start
```

### Google Console (redirect_uri_mismatch)

Web client (Firebase / Cloud Console) da qo'shing:

**Authorized JavaScript origins**
- `http://localhost:8081`
- `http://127.0.0.1:8081`

**Authorized redirect URIs**
- `http://localhost:8081`
- `http://localhost:8081/`
- `http://127.0.0.1:8081`
- `mysaloon://`

DevTools console da `[google-auth] redirectUri = ...` chiqadi — shu URLni ham qo'shing.
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
