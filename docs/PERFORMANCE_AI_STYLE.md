# /ai-style performance — measured findings (2026-03-10)

## LCP element (production, Chrome Performance API)

| Field | Value |
|-------|--------|
| **Element** | `<img>` — `/ai-style/try-on-selfie-hero.png` |
| **Natural size** | 864×1152 |
| **Displayed** | ~854×790 |
| **Transfer size** | **1,118,619 bytes** |
| **Load duration** | ~2.3s (single connection) |
| **Priority** | `loading: auto`, no `fetchPriority` (pre-fix deploy) |

Secondary large images on first visit:

- `/images/onboarding/universal.webp` — 406 KB (onboarding modal)
- `/mysaloon-app-icon.png` — 324 KB (42×42 UI)

## HTTP (production headers)

```
HTTP/1.1 200 OK
Server: nginx/1.24.0 (Ubuntu)
Content-Type: image/png
Content-Length: 1118619
(no Cache-Control on hero PNG — explains Chrome “cache lifetime” hint ~1.1 MB)
```

**Modern HTTP** audit: responses served over **HTTP/1.1** on this host; deploy config updated to `listen 443 ssl http2` (apply on VPS + reload nginx).

## After code changes (asset sizes in repo, not yet prod CrUX)

| Asset | Before | After (WebP) |
|-------|--------|----------------|
| Try-on hero (mobile LCP) | 1.12 MB PNG | **~69 KB** (`-720.webp`), srcset to 864w |
| Desktop hero slides | ~125 KB PNG each | **~40–46 KB** (`-720.webp`) |
| Cache-Control on `/ai-style/*.webp` | absent | `public, max-age=604800, immutable` (Nitro) |

Expected LCP improvement: dominated by replacing 1.1 MB PNG with <100 KB WebP + `preload` + `fetchPriority="high"`. **Re-measure in Chrome after deploy** — target <2.5s not guaranteed on slow 3G.

## Verification checklist post-deploy

1. DevTools → Performance → LCP node (should be `try-on-selfie-hero-720.webp`).
2. Network → hero request: `Content-Type: image/webp`, `Cache-Control: immutable`.
3. `curl -sI https://mysaloon.uz/ai-style/try-on-selfie-hero-720.webp` — HTTP/2 + cache headers.
4. GA still receives `page_view` within ~2–3s (idle-loaded gtag).
5. Try-on, camera, Payme, auth smoke tests unchanged.
