# Mobile performance test results

## Automated

| Test | Result |
|------|--------|
| `npm run build:user` | Pass |
| `vitest` `morph-lcp-shell.server.test.ts` | Pass (2) |
| ESLint on touched files | Pass after `--fix` |

## Lighthouse CLI (production URL, pre-deploy)

Strategy: mobile emulation, CPU slowdown 4×.

| URL | Perf | FCP | LCP | TBT | CLS |
|-----|------|-----|-----|-----|-----|
| `https://mysaloon.uz/` | 48 | 5.7 s | 8.8 s | 480 ms | 0.067 |

Raw JSON: `docs/_lighthouse-home-mobile.json` (lab only; not committed if excluded).

## Post-deploy checks (run after VPS user deploy)

1. `curl` homepage: **must not** contain `morph-lcp-static` or `try-on-selfie-hero`.
2. `curl /ai-style`: **must** contain `morph-lcp-static` + hero preload.
3. PageSpeed Insights mobile ×3 median on `/` and `/ai-style`.
4. Manual: mobile Chrome scroll on Explore, dock navigation, try-on — no new freezes.

## Targets vs current (honest)

| Target | Pre-deploy lab | Post-deploy |
|--------|----------------|-------------|
| Perf 95+ | 48–58 | *pending VPS deploy* |
| FCP ≤ 1.8 s | 5.7–5.9 s | *pending* |
| LCP ≤ 2.5 s | 8.8–9.1 s | *pending* |
| TBT ≤ 150 ms | 170–480 ms | *pending* |

Post-deploy rows will be filled after production verification in `MOBILE_PERFORMANCE_DEPLOY_REPORT.md`.