import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "q required" }, { status: 400 });
  }

  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", q);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("addressdetails", "0");

  // Nominatim usage policy: identify the application.
  const ua = "MyBarber barber-web (geocode)";
  const res = await fetch(endpoint.toString(), {
    headers: {
      "User-Agent": ua,
      "Accept-Language": "uz,ru,en;q=0.8",
    },
    // avoid caching in edge by default; client can debounce
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: `geocode_failed_${res.status}` },
      { status: 502 },
    );
  }

  const data = (await res.json().catch(() => null)) as Array<{ lat?: string; lon?: string }> | null;
  const first = Array.isArray(data) ? data[0] : null;
  const lat = first?.lat ? Number(first.lat) : NaN;
  const lng = first?.lon ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Basic sanity clamp.
  const out = { ok: true, lat: clamp(lat, -90, 90), lng: clamp(lng, -180, 180) };
  return NextResponse.json(out, {
    headers: {
      // tiny cache to reduce bursts while typing
      "Cache-Control": "public, max-age=30",
    },
  });
}

