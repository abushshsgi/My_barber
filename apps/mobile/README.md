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
  (Web OAuth client ID — backend `GOOGLE_OAUTH_CLIENT_ID` bilan mos)

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

## Holat

- Home, Profil stack, Obuna, Login/Splash
- Auth Bearer + refresh ulangan
