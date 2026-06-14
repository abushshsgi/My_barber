const DEV_API_TARGET = process.env.DEV_API_TARGET ?? "http://127.0.0.1:8000";

/** TanStack Start dev serverida Vite proxy ishlamaydi — /api/v1 ni production API ga yo‘naltirish. */
export async function maybeProxyDevApi(request: Request): Promise<Response | null> {
  if (process.env.NODE_ENV === "production") return null;

  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/v1")) return null;

  const target = `${DEV_API_TARGET}${url.pathname}${url.search}`;
  const headers = new Headers(request.headers);
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

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  try {
    return await fetch(target, init);
  } catch (error) {
    console.error("[api-dev-proxy]", error);
    return Response.json({ detail: "API proxy xatolik" }, { status: 502 });
  }
}
