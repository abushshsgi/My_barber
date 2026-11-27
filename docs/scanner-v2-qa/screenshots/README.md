# Scanner V2 QA screenshots

## Status

Screenshots are produced only when Playwright e2e can reach a running `apps/user` server.

### Simulated (web Playwright) — expected files

| File | State |
|------|--------|
| `demo-result-simulated.png` | Demo result page |
| `scanner-chrome-simulated.png` | Authenticated scanner chrome |
| `manual-entry-simulated.png` | Manual barcode dialog |
| `offline-mobile-viewport-simulated.png` | Offline + mobile viewport |
| `result-sources-desktop-simulated.png` | Result sources / sections |
| `mode-image-simulated.png` | Image mode selected |

### Local browser captures (2026-11-27)

Taken against `http://127.0.0.1:3000` with the e2e mock session. Camera permission was denied in this browser, so these are UI captures, not physical barcode decodes. The result page is the existing demo fixture (`Deep Cleanse Shampoo`), not a scanned retail product.

| File | State |
|------|--------|
| `desktop-scanner-local.png` | Desktop scanner chrome |
| `mobile-web-scanner-local.png` | 390px-wide scanner layout |
| `mobile-web-offline-local.png` | Same layout after `navigator.onLine = false` |
| `demo-advisor-result-local.png` | Demo Advisor result |
| `demo-result-sources-local.png` | Demo sources and INCI |

### Not captured (native / physical)

| Surface | Status |
|---------|--------|
| Expo Android permission / live scan / torch | **Missing** — owner physical QA |
| Expo iOS permission / live scan | **Missing** — owner physical QA + Apple credentials |
| Real Android Chrome / iOS Safari camera LED | **Missing** — owner physical QA |
| Live “detected / resolving / found / not-found” with real barcode | **Missing** — requires device + API |

## Why screenshots may be missing

1. Playwright was not run, or user-web server unavailable at Playwright `baseURL`.
2. Camera / HTTPS secure-context prevents real live-preview capture in CI.
3. Native builds / EAS not executed in this RC session.

Do not invent product UI screenshots. Prefer demo-route and chrome-only captures labeled **simulated**.
