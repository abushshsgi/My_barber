import { resolveFetchBase } from "@/lib/api/base-url";
import { SITE_ORIGIN } from "@/seo/constants";
import {
  buildHairstyleImageSeo,
  hairstylePassesSitemapGate,
  type HairstyleImageSeo,
  type HairstyleSeoSource,
} from "@/seo/hairstyles/image-seo";

const SEO_CACHE_MS = 60_000;
let catalogCache: { at: number; rows: HairstyleSeoSource[] } | null = null;

function apiBase(): string {
  return resolveFetchBase("");
}

export async function fetchPublishedHairstyles(): Promise<HairstyleSeoSource[]> {
  if (catalogCache && Date.now() - catalogCache.at < SEO_CACHE_MS) {
    return catalogCache.rows;
  }
  try {
    const res = await fetch(`${apiBase()}/api/v1/hairstyles/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return catalogCache?.rows ?? [];
    const list = (await res.json()) as HairstyleSeoSource[];
    catalogCache = { at: Date.now(), rows: list };
    return list;
  } catch {
    return catalogCache?.rows ?? [];
  }
}

export type ExploreStyleSeoPack = {
  styleId: string;
  canonical: string;
  title: string;
  description: string;
  image: string | null;
  styleTitle: string;
  imageSeo: HairstyleImageSeo;
  hairLength: string;
  audience: string;
  tryOnHref: string;
};

export async function fetchExploreStyleSeo(styleId: string): Promise<ExploreStyleSeoPack | null> {
  const rows = await fetchPublishedHairstyles();
  const row =
    rows.find((r) => r.id === styleId || r.slug === styleId) ??
    (await fetchSingleHairstyle(styleId));
  if (!row || !hairstylePassesSitemapGate(row)) return null;

  const imageSeo = buildHairstyleImageSeo(row);
  const canonical = `${SITE_ORIGIN}/explore/${encodeURIComponent(row.id ?? row.slug)}`;
  return {
    styleId: row.id ?? row.slug,
    canonical,
    title: imageSeo.pageTitle.uz,
    description: imageSeo.metaDescription.uz,
    image: imageSeo.imageUrl,
    styleTitle: imageSeo.modelName,
    imageSeo,
    hairLength: row.hair_length,
    audience: row.audience,
    tryOnHref: `/explore/${encodeURIComponent(row.id ?? row.slug)}/try`,
  };
}

async function fetchSingleHairstyle(styleId: string): Promise<HairstyleSeoSource | null> {
  try {
    const res = await fetch(`${apiBase()}/api/v1/hairstyles/${encodeURIComponent(styleId)}/`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as HairstyleSeoSource;
  } catch {
    return null;
  }
}
