import { resolveFetchBase } from "@/lib/api/base-url";
import { SITE_ORIGIN } from "./constants";

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

function apiBase(): string {
  return resolveFetchBase("");
}

function toIsoDate(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

export async function fetchSalonSitemapUrls(limit = 2000): Promise<SitemapUrl[]> {
  const out: SitemapUrl[] = [];
  let page = 1;
  const pageSize = 100;

  while (out.length < limit) {
    const res = await fetch(`${apiBase()}/api/v1/salons/?page=${page}&page_size=${pageSize}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      results?: Array<{
        id?: string | number;
        name?: string;
        description?: string;
        cover_image?: string | null;
        updated_at?: string;
      }>;
      next?: string | null;
    };
    const results = data.results ?? [];
    if (!results.length) break;

    for (const row of results) {
      const id = row.id != null ? String(row.id) : "";
      const name = row.name?.trim();
      const hasCover = Boolean(row.cover_image?.trim());
      const hasDesc = Boolean(row.description?.trim());
      if (!id || !name || (!hasCover && !hasDesc)) continue;
      out.push({
        loc: `${SITE_ORIGIN}/salon/${encodeURIComponent(id)}`,
        lastmod: toIsoDate(row.updated_at),
        changefreq: "weekly",
        priority: 0.6,
      });
    }

    if (!data.next) break;
    page += 1;
  }

  return out.slice(0, limit);
}

export async function fetchHairstyleSitemapUrls(limit = 3000): Promise<SitemapUrl[]> {
  const res = await fetch(`${apiBase()}/api/v1/hairstyles/`, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const list = (await res.json()) as Array<{
    id?: string;
    slug?: string;
    description_uz?: string;
    tags?: string[];
    image_url?: string;
    updated_at?: string;
  }>;

  const out: SitemapUrl[] = [];
  for (const row of list) {
    const id = row.id?.trim() || row.slug?.trim();
    if (!id) continue;
    const hasDesc = Boolean(row.description_uz?.trim());
    const hasTags = Boolean(row.tags?.length);
    const hasImage = Boolean(row.image_url?.trim());
    if (!hasImage || (!hasDesc && !hasTags)) continue;
    out.push({
      loc: `${SITE_ORIGIN}/explore/${encodeURIComponent(id)}`,
      lastmod: toIsoDate(row.updated_at),
      changefreq: "monthly",
      priority: 0.5,
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function fetchBarberSitemapUrls(limit = 1500): Promise<SitemapUrl[]> {
  const out: SitemapUrl[] = [];
  let page = 1;
  const pageSize = 100;

  while (out.length < limit) {
    const res = await fetch(`${apiBase()}/api/v1/barbers/?page=${page}&page_size=${pageSize}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) break;
    const data = (await res.json()) as {
      results?: Array<{
        id?: number;
        barber_id?: number;
        display_name?: string;
        avatar?: string | null;
        updated_at?: string;
      }>;
      next?: string | null;
    };
    const results = data.results ?? [];
    if (!results.length) break;

    for (const row of results) {
      const id = row.barber_id ?? row.id;
      const name = row.display_name?.trim();
      const hasAvatar = Boolean(row.avatar?.trim());
      if (id == null || !name || !hasAvatar) continue;
      out.push({
        loc: `${SITE_ORIGIN}/barber/${encodeURIComponent(String(id))}`,
        lastmod: toIsoDate(row.updated_at),
        changefreq: "weekly",
        priority: 0.55,
      });
    }

    if (!data.next) break;
    page += 1;
  }

  return out.slice(0, limit);
}