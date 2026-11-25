import { HREFLANG_LOCALES, SITE_ORIGIN } from "./constants";
import { LANDING_PAGES } from "./content/landings";
import { localizedLandingPath } from "./registry";
import type { SitemapUrl } from "./sitemap-dynamic.server";
import {
  fetchBarberSitemapUrls,
  fetchHairstyleSitemapUrls,
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

export function renderUrlSet(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : "";
      const changefreq = u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : "";
      const priority = u.priority != null ? `<priority>${u.priority.toFixed(2)}</priority>` : "";
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    ${lastmod}\n    ${changefreq}\n    ${priority}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
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

export async function buildSitemapSection(
  section: "static" | "morf" | "salons" | "styles" | "barbers",
): Promise<string> {
  switch (section) {
    case "static":
      return renderUrlSet(staticSitemapUrls());
    case "morf":
      return renderUrlSet(morfMarketingSitemapUrls());
    case "salons":
      return renderUrlSet(await fetchSalonSitemapUrls());
    case "styles":
      return renderUrlSet(await fetchHairstyleSitemapUrls());
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
    { loc: `${SITE_ORIGIN}/sitemap-barbers.xml`, lastmod: today },
  ]);
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
