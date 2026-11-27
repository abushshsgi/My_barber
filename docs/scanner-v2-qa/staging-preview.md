# Scanner V2 — Staging and HTTPS preview

Production deploys stay on `main` only:

- `.github/workflows/deploy-frontends-vps.yml`
- `.github/workflows/deploy-vps.yml`

Those workflows were not changed. This branch is not merged and is not deployed to `mysaloon.uz` or `api.mysaloon.uz`.

## Optional staging workflow

`.github/workflows/preview-user-staging.yml` runs only from **workflow_dispatch**, and only when the ref is not `main`. It SSHs only if all of these exist and pass the production guard:

| Name | Kind | Meaning |
| --- | --- | --- |
| `STAGING_SSH_HOST` | Actions variable | Host that is not `mysaloon.uz`, `www.mysaloon.uz`, or `api.mysaloon.uz` |
| `STAGING_SSH_USER` | Actions variable | SSH user |
| `STAGING_WEB_ROOT` | Actions variable | Directory that is not `/opt/mysaloon/Mybarber` or `/var/www/mysaloon/source` |
| `STAGING_SSH_KEY` | Actions secret | Key that can write only that directory |

The dispatched API origin is refused when it contains `mysaloon.uz`. The remote script uploads `apps/user/dist` into `STAGING_WEB_ROOT` only. It does not run migrations, does not restart `mysaloon.service` or `mysaloon-user`, and does not call `deploy-frontends.sh` or `deploy-backend.sh`. Serving that directory (separate port, HTTPS certificate, staging `API_UPSTREAM_URL`) is still an owner step. Until the variables exist, the job is skipped.

Until those variables exist, the job does nothing. No preview URL is published from this repository today.

## Local desktop (secure context)

`http://127.0.0.1` is a secure context, so the desktop camera works without a certificate.

```bash
# Terminal A — local API. Do not use production DATABASE_URL.
cd backend
# existing venv
python manage.py runserver 127.0.0.1:8000

# Terminal B — user web. DEV_API_TARGET defaults to http://127.0.0.1:8000
npm run dev:user
```

Open: `http://127.0.0.1:3000/ai-style/care/ingredient`

Scans hit the local API through the Vite proxy. They are not written to production unless `DEV_API_TARGET` is pointed at `https://api.mysaloon.uz`. Do not do that for QA.

## Phone browser (camera needs HTTPS)

A LAN address such as `http://192.168.0.10:3000` is not a secure context. Chrome and Safari will block the camera.

With the user app already on port 3000:

```bash
node scripts/dev-https-preview.mjs
```

The script prints `https://127.0.0.1:3443/ai-style/care/ingredient` and the LAN URL. It generates a local certificate with OpenSSL when `openssl` is on PATH, or prints the exact Windows `New-SelfSignedCertificate` commands when it is not. Install that certificate on the phone, or the browser will warn and may still block the camera.

The proxy forwards to `127.0.0.1:3000`, so API calls still use the local backend. No extra host is purchased.

## Native app

See `docs/scanner-v2-qa/physical-device-qa.md`. Set `EXPO_PUBLIC_API_URL` to the LAN URL of the local API (`http://<pc>:8000`). Native camera does not need HTTPS. Do not leave the default production API in place while creating test scans.

Expo Go for SDK 57 can run the scanner. Sign in to EAS only if Expo Go rejects the SDK:

```bash
cd apps/mobile
npx eas-cli login
npx eas-cli build -p android --profile development --non-interactive
```

iOS development builds need an Apple team on a Mac, or the same EAS login plus `npx eas-cli build -p ios --profile development`. Do not submit to TestFlight, Google Play, or the App Store.
