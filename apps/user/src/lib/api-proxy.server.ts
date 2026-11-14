import { resolveDemoApiOrigin } from "@mybarber/shared/demo-env";

const DEV_API_TARGET = process.env.DEV_API_TARGET ?? "http://127.0.0.1:8000";

function upstreamBase(requestHost?: string | null): string {
  if (process.env.NODE_ENV !== "production") return DEV_API_TARGET;
  const demo = resolveDemoApiOrigin(requestHost);
  if (demo) return demo.replace(/\/+$/, "");
  const fromEnv = process.env.API_UPSTREAM_URL?.trim();
  return (fromEnv || "https://api.mysaloon.uz").replace(/\/+$/, "");
}

function isProxyPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/media/") ||
    pathname.startsWith("/covers/pexels/")
  );
}

function resolveUpstreamUrl(url: URL): string | null {
  if (url.pathname.startsWith("/covers/pexels/")) {
    const match = url.pathname.match(/^\/covers\/pexels\/(\d+)/);
    if (!match) return null;
    const id = match[1];
    const w = url.searchParams.get("w") ?? "800";
    return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
  }
  return `${upstreamBase(url.hostname)}${url.pathname}${url.search}`;
}

function stripHopByHopHeaders(headers: Headers): void {
  for (const key of [...headers.keys()]) {
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "connection" ||
      lower === "expect" ||
      lower === "content-length" ||
      lower === "transfer-encoding"
    ) {
      headers.delete(key);
    }
  }
}

/** Cloudflare __cf_bm / _cfuvid cross-origin Set-Cookie brauzerda rad etiladi — proxy javobidan olib tashlaymiz. */
function sanitizeProxyResponseHeaders(headers: Headers): void {
  headers.delete("set-cookie");
  // fetch body allaqachon decode qilingan — eski content-length/content-encoding noto‘g‘ri bo‘ladi.
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
}

const PUBLIC_GET_CACHE_SECONDS = 60;
const PUBLIC_HAIRSTYLE_CACHE_SECONDS = 120;
const PUBLIC_MEDIA_CACHE_SECONDS = 60 * 60 * 24 * 7;

const PRIVATE_MEDIA_PREFIXES = [
  "/media/wallet/",
  "/media/ai-style/tryon-results/",
  "/media/ai-style/generations/",
  "/media/ai-style/uploads/",
] as const;

function isPrivateMediaPath(pathname: string): boolean {
  return PRIVATE_MEDIA_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Ommaviy GET — brauzer/CDN qisqa (API) yoki uzoq (media) keshlaydi. */
function applyPublicCacheHeaders(request: Request, pathname: string, headers: Headers): void {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  if (pathname === "/api/v1/site/config" || pathname === "/api/v1/site/config/") {
    headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    headers.set("Pragma", "no-cache");
    return;
  }
  if (pathname.startsWith("/media/") || pathname.startsWith("/covers/pexels/")) {
    if (pathname.startsWith("/media/") && isPrivateMediaPath(pathname)) {
      headers.set("Cache-Control", "private, max-age=3600");
      return;
    }
    headers.set("Cache-Control", `public, max-age=${PUBLIC_MEDIA_CACHE_SECONDS}, immutable`);
    return;
  }
  if (pathname.startsWith("/api/v1/hairstyles")) {
    headers.set(
      "Cache-Control",
      `public, max-age=${PUBLIC_HAIRSTYLE_CACHE_SECONDS}, stale-while-revalidate=600`,
    );
    return;
  }
  if (!pathname.startsWith("/api/v1/salons") && !pathname.startsWith("/api/v1/barbers")) return;
  if (/\/(book|favorite|claim)/i.test(pathname)) return;
  headers.set(
    "Cache-Control",
    `public, max-age=${PUBLIC_GET_CACHE_SECONDS}, stale-while-revalidate=300`,
  );
}

/** /api/v1, /media, /covers/pexels ni upstream ga yo‘naltirish (same-origin, Set-Cookie tozalangan). */
export async function maybeProxyApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isProxyPath(url.pathname)) return null;

  const target = resolveUpstreamUrl(url);
  if (!target) return Response.json({ detail: "Not found" }, { status: 404 });
  const headers = new Headers(request.headers);
  stripHopByHopHeaders(headers);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    const outHeaders = new Headers(upstream.headers);
    sanitizeProxyResponseHeaders(outHeaders);
    applyPublicCacheHeaders(request, url.pathname, outHeaders);

    if (request.method === "HEAD") {
      return new Response(null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    // Nitro (VPS): stream bodies when available — lower TTFB and memory for /media and Pexels.
    if (upstream.body) {
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    const body = await upstream.arrayBuffer();
    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  } catch (error) {
    console.error("[api-proxy]", error);
    return Response.json({ detail: "API proxy xatolik" }, { status: 502 });
  }
}
