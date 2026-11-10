/** Long-lived caching for public bytes served by Nitro (not HTML, not private API). */

const HASHED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css|woff2?)$/i;
const PUBLIC_IMAGE =
  /^\/(ai-style|images|brand|covers)\/.+\.(webp|avif|png|jpe?g|svg|ico)$/i;

export function applyStaticCacheHeaders(request: Request, response: Response): Response {
  if (request.method !== "GET" && request.method !== "HEAD") return response;
  if (response.status !== 200 && response.status !== 304) return response;

  const { pathname } = new URL(request.url);
  let cache: string | null = null;
  if (HASHED_ASSET.test(pathname)) {
    cache = "public, max-age=31536000, immutable";
  } else if (PUBLIC_IMAGE.test(pathname)) {
    cache = "public, max-age=604800, immutable";
  } else if (pathname === "/favicon.ico" || /^\/favicon-\d+\.png$/i.test(pathname)) {
    cache = "public, max-age=604800";
  }

  if (!cache) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cache);
  if (request.method === "HEAD") {
    return new Response(null, { status: response.status, statusText: response.statusText, headers });
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
