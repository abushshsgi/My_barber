import { resolveFetchBase } from "@/lib/api/base-url";
import {
  buildHairstyleImageSeo,
  hairstylePassesSitemapGate,
  type HairstyleSeoSource,
} from "./hairstyles/image-seo";
import { indexableCategories } from "./hairstyles/categories";
import { SITE_ORIGIN } from "./constants";

export type SitemapImageRef = {
  loc: string;
  title?: string;
  caption?: string;
};

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
  images?: SitemapImageRef[];
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

async function fetchHairstyleRows(): Promise<HairstyleSeoSource[]> {
  const res = await fetch(`${apiBase()}/api/v1/hairstyles/`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  return (await res.json()) as HairstyleSeoSource[];
}

export async function fetchHairstyleSitemapUrls(limit = 3000): Promise<SitemapUrl[]> {
  const list = await fetchHairstyleRows();
  const out: SitemapUrl[] = [];

  for (const row of list) {
    if (!hairstylePassesSitemapGate(row)) continue;
    const id = row.id?.trim() || row.slug?.trim();
    if (!id) continue;
    const imageSeo = buildHairstyleImageSeo(row);
    out.push({
      loc: `${SITE_ORIGIN}/explore/${encodeURIComponent(id)}`,
      lastmod: toIsoDate((row as { updated_at?: string }).updated_at),
      changefreq: "monthly",
      priority: 0.55,
      images: [
        {
          loc: imageSeo.imageUrl,
          title: imageSeo.pageTitle.uz,
          caption: imageSeo.caption.uz,
        },
      ],
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Google Image Sitemap: faqat rasm URLlari bilan alohida urlset (parent = model sahifasi). */
export async function fetchImageOnlySitemapUrls(limit = 5000): Promise<SitemapUrl[]> {
  return fetchHairstyleSitemapUrls(limit);
}

export async function fetchExploreCategorySitemapUrls(): Promise<SitemapUrl[]> {
  const rows = await fetchHairstyleRows();
  const cats = indexableCategories(rows.filter(hairstylePassesSitemapGate));
  const today = new Date().toISOString().slice(0, 10);
  return cats.map((cat) => ({
    loc: `${SITE_ORIGIN}${cat.uzPath}`,
    lastmod: today,
    changefreq: "weekly" as const,
    priority: cat.priority,
  }));
}

type BlogSitemapRow = {
  slug?: string;
  locale?: string;
  updated_at?: string;
  title?: string;
};

export async function fetchBlogSitemapUrls(limit = 500): Promise<SitemapUrl[]> {
  const out: SitemapUrl[] = [];
  for (const requested of ["uz", "ru", "en"] as const) {
    if (out.length >= limit) break;
    const res = await fetch(`${apiBase()}/api/v1/content/articles/?locale=${requested}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) continue;
    const list = (await res.json()) as BlogSitemapRow[];
    for (const row of list) {
      const slug = row.slug?.trim();
      const locale = row.locale?.trim() || requested;
      if (!slug) continue;
      const prefix = locale === "uz" ? "" : `/${locale}`;
      out.push({
        loc: `${SITE_ORIGIN}${prefix}/guides/${encodeURIComponent(slug)}`,
        lastmod: toIsoDate(row.updated_at),
        changefreq: "monthly",
        priority: 0.65,
      });
      if (out.length >= limit) break;
    }
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

export function countSitemapImages(urls: SitemapUrl[]): number {
  return urls.reduce((acc, u) => acc + (u.images?.length ?? 0), 0);
}
