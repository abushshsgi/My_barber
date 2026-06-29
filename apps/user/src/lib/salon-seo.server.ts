type SalonSeoMeta = {
  name: string;
  about: string;
  address: string;
  image: string | null;
  rating: number;
};

const SITE_ORIGIN = "https://www.mysaloon.uz";

function apiBase(): string {
  return (process.env.API_UPSTREAM_URL ?? "https://api.mysaloon.uz").replace(/\/+$/, "");
}

function absoluteMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  const pexels = raw.match(/(?:https?:\/\/)?images\.pexels\.com\/photos\/(\d+)/i);
  if (pexels) return `${SITE_ORIGIN}/covers/pexels/${pexels[1]}?w=1200`;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const apiMedia = raw.match(/^https?:\/\/api\.mysaloon\.uz(\/media\/.*)$/i);
    if (apiMedia) return `${SITE_ORIGIN}${apiMedia[1]}`;
    return raw;
  }

  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return `${apiBase()}/${raw.replace(/^\/+/, "")}`;
}

function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function salonPublicPageUrl(salonId: string): string {
  return `${SITE_ORIGIN}/salon/${salonId}`;
}

export async function fetchSalonSeoMeta(salonId: string): Promise<SalonSeoMeta | null> {
  try {
    const res = await fetch(`${apiBase()}/api/v1/salons/${salonId}/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      name?: string;
      description?: string;
      address?: string;
      cover_image?: string | null;
      rating_avg?: number | null;
    };

    const name = data.name?.trim() || "Salon";
    const about = data.description?.trim() || "";
    const address = data.address?.trim() || "";
    const description = about || address || `${name} — mysaloon.uz orqali online band qiling.`;

    return {
      name,
      about: trimDescription(description),
      address,
      image: absoluteMediaUrl(data.cover_image) ?? `${SITE_ORIGIN}/placeholder-salon.svg`,
      rating: data.rating_avg ?? 0,
    };
  } catch {
    return null;
  }
}

export function buildSalonHeadMeta(salonId: string, seo: SalonSeoMeta | null) {
  const url = salonPublicPageUrl(salonId);
  const title = seo ? `${seo.name} — mysaloon.uz` : "Salon — mysaloon.uz";
  const description =
    seo?.about ||
    seo?.address ||
    "mysaloon.uz — O'zbekistondagi salon va sartaroshxonalarni online band qilish platformasi.";

  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: seo?.name ?? title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "mysaloon.uz" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: seo?.name ?? title },
    { name: "twitter:description", content: description },
  ];

  if (seo?.image) {
    meta.push(
      { property: "og:image", content: seo.image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: seo.image },
    );
  }

  return { meta, links: [{ rel: "canonical", href: url }] };
}
