# MySaloon — Mobil production qo'llanma

## Capacitor ga animatsiya qo'shish mumkinmi?

**Ha**, bir necha usul bor:

| Usul | Nima qiladi | Qiyinlik |
|------|-------------|----------|
| **Splash fade** | Ilova ochilganda splash asta yo'qoladi | Tayyor (`launchFadeOutDuration: 600`) |
| **CSS / Framer Motion** | Ilova ichida animatsiya (sizda bor) | Oson |
| **Lottie JSON** | Logo animatsiyasi (`.json` fayl) | O'rtacha — `@lottiefiles/react-lottie-player` |
| **HTML5 `<video>`** | Intro video (WebView ichida) | O'rtacha — `public/intro.mp4` |
| **Native video splash** | Android/iOS alohida video fayl | Qiyin — custom native plugin kerak |

**Tavsiya:** Splash fade (tayyor) + ilova ichida Lottie yoki qisqa video. To'liq native video splash Play Market uchun ortiqcha murakkab.

Hozirgi sozlama (`capacitor.config.ts`):

```typescript
SplashScreen: {
  launchShowDuration: 2000,      // 2 soniya ko'rinadi
  launchFadeOutDuration: 600,    // 0.6s fade animatsiya
  launchAutoHide: true,
  backgroundColor: "#171512",    // user: qora, barber: #F7F5F0
}
```

Keyinroq Lottie qo'shish uchun: `public/splash-lottie.json` + React komponent native platformda birinchi ochilishda.

---

## PWA qanday ishlaydi?

PWA = veb-sayt + ilova xususiyatlari. **App Store kerak emas** (iOS uchun aynan shu).

### iOS (Safari)

1. Vercel'da deploy: `www.mysaloon.uz` (user) yoki `partner.mysaloon.uz` (barber)
2. Foydalanuvchi Safari'da saytni ochadi
3. Pastdagi **Share** → **Add to Home Screen**
4. Uy ekranida ikonka paydo bo'ladi — to'liq ekran ishlaydi

Service worker (`sw.js`) offline cache va tez yuklanish beradi.

### Android (PWA emas — Capacitor)

Android foydalanuvchilar **Play Market**dan `.apk/.aab` yuklab oladi. PWA emas.

---

## Production deploy

### 1. Vercel (PWA — iOS va brauzer)

| Project | Root Directory | Domen | Env |
|---------|----------------|-------|-----|
| user | `apps/user` | `www.mysaloon.uz` | `NEXT_PUBLIC_API_URL=https://api.mysaloon.uz`, `NEXT_PUBLIC_AUTH_KIND=user` |
| barber | `apps/barber` | `partner.mysaloon.uz` | `VITE_API_URL=https://api.mysaloon.uz` |

Deploy qilgandan keyin tekshiring:
- `https://www.mysaloon.uz/manifest.webmanifest` — JSON qaytishi kerak
- Login ishlashi kerak

### 2. Railway (backend)

```env
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=api.mysaloon.uz,.railway.app
API_PUBLIC_HOST=api.mysaloon.uz
FRONTEND_USER_ORIGIN=https://www.mysaloon.uz,https://mysaloon.uz
FRONTEND_BARBER_ORIGIN=https://partner.mysaloon.uz
REDIS_URL=redis://...
```

### 3. Capacitor (Android Play Market)

```bash
# Mijoz ilovasi — to‘liq Vite build + cap sync (VITE_API_URL majburiy)
VITE_API_URL=https://api.mysaloon.uz npm run cap:android
npm run cap:open -w user-web

# Barber ilovasi
npm run cap:barber
npm run cap:open -w tanstack_start_ts
```

`npx cap sync` ni **faqat** `build:mobile` dan keyin ishlating. Stub `dist/client` bilan sync qilsangiz telefonda oq ekran / `cap-sync` matni chiqadi.

Android Studio → **Run** (yoki Build → Generate Signed Bundle (.aab) → Play Console).

| Ilova | App ID | Listing nomi |
|-------|--------|--------------|
| Mijoz | `uz.mysaloon.app` | MySaloon |
| Barber | `uz.mysaloon.partner` | MySaloon Partner |

#### User native qatlam (FCM, GPS, kamera, back, deep link)

1. **Firebase:** Console → Android app `uz.mysaloon.app` → `google-services.json` ni `apps/user/android/app/` ga qo‘ying (gitignore — commit qilinmaydi).
   Package **`uz.mysaloon.app`** bo‘lishi shart (`mysaloon.uz` emas).
2. **Backend env (Railway):**
   - `FIREBASE_SERVICE_ACCOUNT_JSON=...` (yoki `FCM_SERVER_KEY` legacy)
   - ixtiyoriy: `FCM_PROJECT_ID=mysaloon-cb921` (yoki JSON `project_id`)
3. **Migration:** `python manage.py migrate` (`UserPushToken`, `UserSession.client_kind`)
4. **App Links:** `apps/user/public/.well-known/assetlinks.json` ichida upload keystore SHA-256 ni qo‘ying; Vercel deploydan keyin `https://www.mysaloon.uz/.well-known/assetlinks.json` ochilishi kerak.
5. **SHA-256 olish:**
   ```bash
   keytool -list -v -keystore your-upload.jks -alias your-alias
   ```

**Hozirgi app versiya:** `versionCode 5` / `versionName 1.2.2`

Native pluginlar: App (hardware back + deep link), PushNotifications, Geolocation, Camera, Keyboard, Haptics, Share, StatusBar (edge-to-edge, Light icons), SplashScreen (auto-hide, oq fon), Capgo `SocialLogin` (Google).

Android theme: `Theme.AppCompat.Light` + `forceDarkAllowed=false` (Oppo/system dark mode ilovani qorong‘i qilmasin).

#### Google Sign-In (Android, majburiy qo‘lda)

1. Google Cloud Console → Credentials → **Android** OAuth client yarating:
   - Package: `uz.mysaloon.app`
   - SHA-1: debug yoki upload key
2. SHA-1 olish (debug):
   ```bash
   cd apps/user/android && ./gradlew :app:signingReport
   ```
3. Web client ID allaqachon kodda (`server_client_id` + `VITE_GOOGLE_CLIENT_ID`). Android client ID ni `webClientId` ga **qo‘ymang**.
4. Maps JS: Cloud Console da kalitga HTTP referrer sifatida `https://localhost/*` qo‘shing (Capacitor `androidScheme: https`).

| Ruxsat | Nima uchun |
|--------|------------|
| `ACCESS_FINE/COARSE_LOCATION` | Map, onboarding, manzil |
| `CAMERA` | AI try-on, QR pay |
| `POST_NOTIFICATIONS` | FCM (Android 13+) |
| `VIBRATE` | Haptics / push channel |

Hardware back: overlay/sheet yopiladi → `navigateBack` → root tabda ikki marta = `exitApp`.

---

## Lokal production test

```bash
# Barcha build + Capacitor sync tekshiruvi
npm run verify:mobile

# Brauzerda production build ko'rish
npm run build -w user-web && npm run preview -w user-web -- --port 4173
npm run build -w tanstack_start_ts && npm run preview -w tanstack_start_ts -- --port 4174
```

Preview:
- User: http://localhost:4173
- Barber: http://localhost:4174

Chrome DevTools → Application → Manifest / Service Workers tekshiring.

---

## Tekshiruv checklist

- [ ] `https://api.mysaloon.uz/health/` → `{"ok": true}`
- [ ] User login (www.mysaloon.uz)
- [ ] Barber login (partner.mysaloon.uz)
- [ ] iOS: Add to Home Screen → standalone rejim
- [ ] Android: Capacitor APK login + dashboard
- [ ] Chat WebSocket (REDIS_URL production'da yoqilgan)
- [ ] Android: hardware back (sheet → orqaga → exit)
- [ ] Android: joylashuv ruxsati + map/onboarding GPS
- [ ] Android: kamera (AI / QR)
- [ ] Android: FCM — ilova yopiq holatda bron push + tap → deep link
- [ ] App Links: `https://www.mysaloon.uz/salon/<id>` ilovani ochadi
- [ ] `google-services.json` + Railway `FIREBASE_SERVICE_ACCOUNT_JSON`