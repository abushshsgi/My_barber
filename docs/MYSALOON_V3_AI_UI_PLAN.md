# Morf AI, Smart Scanner, and Hair Advisor — UI plan

Date: 2026-11-27  
No code in these three products was changed in this pass. The Scanner V2 release-candidate branch was not merged. Physical camera checks remain unverified.

## What was opened

| Route | Result |
| --- | --- |
| `/morf-ai` | Public marketing page. Screenshot `v3-morf-860.png`. Links to try-on and the catalog. A small purple “MORF AI” pill is the only accent that sits outside the black/white system. The page is a centered reading column, which is fine for a landing page. |
| `/ai-style/care/ingredient` | Redirected to `/auth` because that route is not in the public allowlist. Screenshot `v3-scanner-auth.png`. Google sign-in is not configured in this local session, so the scanner UI itself was not reviewed. |
| `/morf-ai/ingredient-scanner` | Public marketing route. Not restyled. |

## Keep

- Shared scanner engine, barcode validation, and Hair Advisor pipeline on `main`.
- Auth wall on personal scan and advisor results.
- Existing try-on at `/ai-style` and `/explore/{id}/try`.

## Later, only after owner approval

1. Replace the purple Morf pill with the existing foreground chip so the landing page matches guides and explore.
2. Review the scanner and advisor screens while signed in, on a phone, without touching the RC branch.
3. Do not treat the auth redirect as a broken scanner. The product route exists. This local session had no Google client.

## Not claimed

No scanner algorithm change, no advisor schema change, no camera QA, no production deploy.
