import { robotsTxtBody } from "@/seo/robots";
import { buildSitemapSection, sitemapIndexXml } from "@/seo/sitemap";

const XML_HEADERS = {
  "content-type": "application/xml; charset=utf-8",
  "cache-control": "public, max-age=3600",
} as const;

const ROBOTS_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600",
} as const;

type SitemapSection = "static" | "morf" | "salons" | "styles" | "barbers";

export async function maybeServeSeoAsset(request: Request): Promise<Response | null> {
  if (request.method !== "GET") return null;
  const { pathname } = new URL(request.url);

  if (pathname === "/robots.txt") {
    return new Response(robotsTxtBody(), { status: 200, headers: ROBOTS_HEADERS });
  }

  if (pathname === "/sitemap.xml") {
    return new Response(sitemapIndexXml(), { status: 200, headers: XML_HEADERS });
  }

  const sectionMatch = pathname.match(/^\/sitemap-(static|morf|salons|styles|barbers)\.xml$/);
  if (sectionMatch) {
    const section = sectionMatch[1] as SitemapSection;
    const body = await buildSitemapSection(section);
    return new Response(body, { status: 200, headers: XML_HEADERS });
  }

  return null;
}