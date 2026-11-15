# Nginx performance snippets (mysaloon.uz) — apply manually on VPS

**Do not auto-apply.** Review, merge into `mysaloon-user.conf`, then `sudo nginx -t && sudo systemctl reload nginx`.

## Brotli (optional, requires `ngx_brotli` module)

```nginx
brotli on;
brotli_comp_level 5;
brotli_types text/plain text/css text/javascript application/javascript application/json image/svg+xml application/xml;
```

Keep `gzip on;` as fallback for clients without Brotli.

## Precompressed static assets (if precompressing at build)

```nginx
gzip_static on;
brotli_static on;
```

## HTML vs hashed assets (already partially in mysaloon-user.conf)

- `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`
- `/` HTML proxy → `no-cache, must-revalidate` (already set)
- Never cache `/api/v1/` or authenticated `/media/` publicly

## HTTP/2

`listen 443 ssl http2` is already configured — verify with:

```bash
curl -sI https://mysaloon.uz/ | grep -i http
```