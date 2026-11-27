import { HREFLANG_LOCALES, SITE_ORIGIN } from "./constants";
import { LANDING_PAGES } from "./content/landings";
import { localizedLandingPath } from "./registry";
import type { SitemapUrl } from "./sitemap-dynamic.server";
import {
  countSitemapImages,
  fetchBarberSitemapUrls,
  fetchBlogSitemapUrls,
  fetchExploreCategorySitemapUrls,
  fetchHairstyleSitemapUrls,
  fetchImageOnlySitemapUrls,
  fetchSalonSitemapUrls,
} from "./sitemap-dynamic.server";

export function staticSitemapUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  const extras: SitemapUrl[] = [
    { loc: `${SITE_ORIGIN}/ai-style`, changefreq: "weekly", priority: 0.75 },
    { loc: `${SITE_ORIGIN}/ai-style/chat`, changefreq: "weekly", priority: 0.7 },
    { loc: `${SITE_ORIGIN}/today`, changefreq: "daily", priority: 0.75 },
    { loc: `${SITE_ORIGIN}/top`, changefreq: "daily", priority: 0.7 },
    { loc: `${SITE_ORIGIN}/compare`, changefreq: "monthly", priority: 0.5 },
    { loc: `${SITE_ORIGIN}/guides`, changefreq: "weekly", priority: 0.7 },
  ];

  for (const page of LANDING_PAGES) {
    if (!page.sitemap) continue;
    if (page.id.startsWith("morf-ai")) continue;
    if (page.trilingual) {
      for (const locale of HREFLANG_LOCALES) {
        urls.push({
          loc: `${SITE_ORIGIN}${localizedLandingPath(page.id, locale)}`,
          changefreq: page.changefreq,
          priority: page.priority,
        });
      }
    } else {
      urls.push({
        loc: `${SITE_ORIGIN}${localizedLandingPath(page.id, "uz")}`,
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }
  }

  return [...urls, ...extras];
}

export function morfMarketingSitemapUrls(): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  for (const page of LANDING_PAGES) {
    if (!page.sitemap || !page.id.startsWith("morf-ai")) continue;
    for (const locale of HREFLANG_LOCALES) {
      urls.push({
        loc: `${SITE_ORIGIN}${localizedLandingPath(page.id, locale)}`,
        changefreq: page.changefreq,
        priority: page.priority,
      });
    }
  }
  return urls;
}

export function dedupeSitemapImages(
  images: SitemapUrl["images"],
): NonNullable<SitemapUrl["images"]> {
  if (!images?.length) return [];
  const seen = new Set<string>();
  const out: NonNullable<SitemapUrl["images"]> = [];
  for (const img of images) {
    const loc = img.loc.trim();
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    out.push({ ...img, loc });
  }
  return out;
}

function renderImageBlock(images: SitemapUrl["images"]): string {
  const unique = dedupeSitemapImages(images);
  if (!unique.length) return "";
  return unique
    .map((img) => {
      const title = img.title ? `<image:title>${escapeXml(img.title)}</image:title>` : "";
      const caption = img.caption ? `<image:caption>${escapeXml(img.caption)}</image:caption>` : "";
      return `    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>\n      ${title}\n      ${caption}\n    </image:image>`;
    })
    .join("\n");
}

export function renderUrlSet(urls: SitemapUrl[], withImages = false): string {
  const xmlns = withImages
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "";
      const changefreq = u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "";
      const priority = u.priority != null ? `<priority>${u.priority.toFixed(2)}</priority>` : "";
      const images = withImages && u.images?.length ? `\n${renderImageBlock(u.images)}` : "";
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    ${lastmod}\n    ${changefreq}\n    ${priority}${images}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${xmlns}>\n${body}\n</urlset>`;
}

export function renderSitemapIndex(entries: Array<{ loc: string; lastmod?: string }>): string {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : "";
      return `  <sitemap>\n    <loc>${escapeXml(e.loc)}</loc>\n    ${lastmod}\n  </sitemap>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export type SitemapSection =
  "static" | "morf" | "salons" | "styles" | "barbers" | "images" | "categories" | "blog";

export async function buildSitemapSection(section: SitemapSection): Promise<string> {
  switch (section) {
    case "static":
      return renderUrlSet(staticSitemapUrls());
    case "morf":
      return renderUrlSet(morfMarketingSitemapUrls());
    case "salons":
      return renderUrlSet(await fetchSalonSitemapUrls());
    case "styles": {
      const urls = await fetchHairstyleSitemapUrls();
      return renderUrlSet(urls, true);
    }
    case "images": {
      const urls = await fetchImageOnlySitemapUrls();
      return renderUrlSet(urls, true);
    }
    case "categories":
      return renderUrlSet(await fetchExploreCategorySitemapUrls());
    case "blog":
      return renderUrlSet(await fetchBlogSitemapUrls());
    case "barbers":
      return renderUrlSet(await fetchBarberSitemapUrls());
    default:
      return renderUrlSet([]);
  }
}

export function sitemapIndexXml(): string {
  const today = new Date().toISOString().slice(0, 10);
  return renderSitemapIndex([
    { loc: `${SITE_ORIGIN}/sitemap-static.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-morf.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-salons.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-styles.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-images.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-categories.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-blog.xml`, lastmod: today },
    { loc: `${SITE_ORIGIN}/sitemap-barbers.xml`, lastmod: today },
  ]);
}

export async function estimateImageSitemapCount(): Promise<number> {
  const urls = await fetchImageOnlySitemapUrls().catch(() => [] as SitemapUrl[]);
  return countSitemapImages(urls);
}

export async function estimateSitemapUrlCount(): Promise<number> {
  const [salons, styles, barbers] = await Promise.all([
    fetchSalonSitemapUrls().catch(() => [] as SitemapUrl[]),
    fetchHairstyleSitemapUrls().catch(() => [] as SitemapUrl[]),
    fetchBarberSitemapUrls().catch(() => [] as SitemapUrl[]),
  ]);
  return (
    staticSitemapUrls().length +
    morfMarketingSitemapUrls().length +
    salons.length +
    styles.length +
    barbers.length
  );
}
