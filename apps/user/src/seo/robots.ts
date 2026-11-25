import { SITE_ORIGIN } from "./constants";

export function robotsTxtBody(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Allow: /assets/",
    "Disallow: /api/",
    "Disallow: /dev/",
    "Disallow: /wallet",
    "Disallow: /auth",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    "",
  ].join("\n");
}