# Scanner V2 QA screenshots

## Status

Screenshots are produced only when Playwright e2e can reach a running `apps/user` server.

- **Simulated** screenshots (mocked auth / demo route): saved by `apps/user/e2e/hair-advisor-scanner.spec.ts` when `npm run test:e2e -w user-web` runs successfully against a live base URL.
- **Physical device** screenshots: not automated. Capture manually during real-camera QA and place files here with clear names (`android-chrome-ean13.png`, `ios-safari-permission.png`, etc.).

## Why screenshots may be missing

If this folder only contains this README:

1. Playwright was not run in the QA session, or
2. The user-web app server was not available at the Playwright `baseURL`, or
3. Camera / HTTPS secure-context prevents real live-preview capture in CI.

Do not invent product UI screenshots. Prefer demo-route and chrome-only captures labeled **simulated**.
