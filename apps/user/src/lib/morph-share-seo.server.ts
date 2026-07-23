import { resolveApiUpstream, resolveFetchBase } from "@/lib/api/base-url";

const SITE_ORIGIN = "https://www.mysaloon.uz";
const SEO_CACHE_MS = 20_000;

type MorphShareSeo = {
  title: string;
  description: string;
  image: string | null;
  url: string;
  styleTitle: string;
  sharerName: string;
};

type MorphLookSeo = {
  title: string;
  description: string;
  image: string | null;
  url: string;
  styleTitle: string;
};

const shareCache = new Map<string, { at: number; data: MorphShareSeo | null }>();
const lookCache = new Map<string, { at: number; data: MorphLookSeo | null }>();

function apiBase(): string {
  return resolveFetchBase("");
}

function absoluteMediaUrl(path: string | null | undefined): string | null {
  const raw = path?.trim();
  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const apiMedia = raw.match(
      /^https?:\/\/(?:api\.mysaloon\.uz|[a-z0-9-]+\.up\.railway\.app)(\/media\/.*)$/i,
    );
    if (apiMedia) return `${SITE_ORIGIN}${apiMedia[1]}`;
    // Prefer public CDN for catalog hairstyles
    const mediaCatalog = raw.match(
      /^https?:\/\/[^/]+\/media\/(hairstyles\/(?:men|women)\/.+)$/i,
    );
    if (mediaCatalog) return `${SITE_ORIGIN}/${mediaCatalog[1]}`;
    return raw;
  }

  if (raw.startsWith("/media/hairstyles/")) {
    return `${SITE_ORIGIN}${raw.replace(/^\/media/, "")}`;
  }
  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return `${resolveApiUpstream()}/${raw.replace(/^\/+/, "")}`;
}

function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function morphSharePublicUrl(shareId: string): string {
  return `${SITE_ORIGIN}/morf-ai/share/${encodeURIComponent(shareId)}`;
}

export function morphLookPublicUrl(styleId: string): string {
  return `${SITE_ORIGIN}/morf-ai/look/${encodeURIComponent(styleId)}`;
}

export async function fetchMorphShareSeo(shareId: string): Promise<MorphShareSeo | null> {
  const cached = shareCache.get(shareId);
  if (cached && Date.now() - cached.at < SEO_CACHE_MS) return cached.data;

  try {
    const res = await fetch(`${apiBase()}/api/v1/ai/look-share/${encodeURIComponent(shareId)}/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      shareCache.set(shareId, { at: Date.now(), data: null });
      return null;
    }
    const data = (await res.json()) as {
      title?: string;
      after_url?: string | null;
      sharer_name?: string;
      share_page_url?: string;
    };
    const styleTitle = data.title?.trim() || "Morf AI";
    const sharerName = data.sharer_name?.trim() || "Do‘stingiz";
    const description = trimDescription(
      `${styleTitle} — haqiqiy Morf AI natija. Selfie bilan o‘zingizda ham sinab ko‘ring.`,
    );
    const seo: MorphShareSeo = {
      title: `${styleTitle} — ${sharerName} | Morf AI`,
      description,
      image: absoluteMediaUrl(data.after_url) ?? `${SITE_ORIGIN}/brand-logo.png`,
      url: data.share_page_url?.trim() || morphSharePublicUrl(shareId),
      styleTitle,
      sharerName,
    };
    shareCache.set(shareId, { at: Date.now(), data: seo });
    return seo;
  } catch {
    shareCache.set(shareId, { at: Date.now(), data: null });
    return null;
  }
}

export async function fetchMorphLookSeo(styleId: string): Promise<MorphLookSeo | null> {
  const cached = lookCache.get(styleId);
  if (cached && Date.now() - cached.at < SEO_CACHE_MS) return cached.data;

  try {
    const res = await fetch(`${apiBase()}/api/v1/hairstyles/${encodeURIComponent(styleId)}/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      lookCache.set(styleId, { at: Date.now(), data: null });
      return null;
    }
    const data = (await res.json()) as {
      title_uz?: string;
      title?: string;
      image_url?: string;
      description_uz?: string;
    };
    const styleTitle = data.title_uz?.trim() || data.title?.trim() || "Morf AI uslub";
    const description = trimDescription(
      data.description_uz?.trim() ||
        `${styleTitle} — Morf AI da selfie bilan sinab ko‘ring. 10 soniyada natija.`,
    );
    const seo: MorphLookSeo = {
      title: `${styleTitle} — Morf AI | mysaloon.uz`,
      description,
      image: absoluteMediaUrl(data.image_url) ?? `${SITE_ORIGIN}/brand-logo.png`,
      url: morphLookPublicUrl(styleId),
      styleTitle,
    };
    lookCache.set(styleId, { at: Date.now(), data: seo });
    return seo;
  } catch {
    lookCache.set(styleId, { at: Date.now(), data: null });
    return null;
  }
}

function buildOgHead(opts: {
  title: string;
  description: string;
  url: string;
  image: string | null;
  ogTitle?: string;
}) {
  const meta: Array<Record<string, string>> = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.ogTitle ?? opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: opts.url },
    { property: "og:site_name", content: "mysaloon.uz" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.ogTitle ?? opts.title },
    { name: "twitter:description", content: opts.description },
  ];
  if (opts.image) {
    meta.push(
      { property: "og:image", content: opts.image },
      { property: "og:image:width", content: "768" },
      { property: "og:image:height", content: "1024" },
      { name: "twitter:image", content: opts.image },
    );
  }
  return { meta, links: [{ rel: "canonical", href: opts.url }] };
}

export function buildMorphShareHeadMeta(shareId: string, seo: MorphShareSeo | null) {
  const url = seo?.url ?? morphSharePublicUrl(shareId);
  if (!seo) {
    return buildOgHead({
      title: "Morf AI natija — mysaloon.uz",
      description: "Do‘stingizning Morf AI natijasini ko‘ring va o‘zingizda sinang.",
      url,
      image: `${SITE_ORIGIN}/brand-logo.png`,
      ogTitle: "Morf AI — do‘stingizning natijasi",
    });
  }
  return buildOgHead({
    title: seo.title,
    description: seo.description,
    url: seo.url,
    image: seo.image,
    ogTitle: `${seo.styleTitle} — ${seo.sharerName}ning Morf AI natijasi`,
  });
}

export function buildMorphLookHeadMeta(styleId: string, seo: MorphLookSeo | null) {
  const url = seo?.url ?? morphLookPublicUrl(styleId);
  if (!seo) {
    return buildOgHead({
      title: "Morf AI uslub — mysaloon.uz",
      description: "Do‘stingiz sinab ko‘rgan uslubni Morf AI da o‘zingizda sinang.",
      url,
      image: `${SITE_ORIGIN}/brand-logo.png`,
      ogTitle: "Morf AI — bu uslub sizga ham yarashishi mumkin",
    });
  }
  return buildOgHead({
    title: seo.title,
    description: seo.description,
    url: seo.url,
    image: seo.image,
    ogTitle: `${seo.styleTitle} — Morf AI da sinab ko‘ring`,
  });
}
