const DEV_API_TARGET = process.env.DEV_API_TARGET ?? "http://127.0.0.1:8000";
const PROD_API_TARGET = process.env.API_UPSTREAM_URL ?? "https://api.mysaloon.uz";

function upstreamBase(): string {
  return process.env.NODE_ENV === "production" ? PROD_API_TARGET : DEV_API_TARGET;
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
  return `${upstreamBase()}${url.pathname}${url.search}`;
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

    if (request.method === "HEAD") {
      return new Response(null, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    }

    // Vercel serverless: upstream.body stream ko‘pincha bo‘sh qaytadi — buffer majburiy.
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
