import { fetchPublishedHairstyles } from "@/lib/hairstyle-seo.server";
import { EXPLORE_LCP_HERO_SRC } from "@/lib/explore-lcp-static";
import type { SeoLocale } from "@/seo/constants";
import { getLandingCopy } from "@/seo/registry";
import { buildHairstyleImageSeo } from "@/seo/hairstyles/image-seo";
import { buildPrerenderInner, escapeHtml } from "@/seo/html-utils";

const SAMPLE_STYLE_COUNT = 12;

/** Server-side explore HTML snapshot (JS o'chirilgan holda ham ko'rinadi). */
export async function buildExploreCatalogPrerender(locale: SeoLocale): Promise<string> {
  const copy = getLandingCopy("explore", locale);
  const rows = await fetchPublishedHairstyles();
  const slice = rows.slice(0, SAMPLE_STYLE_COUNT);
  const listHtml =
    slice.length > 0
      ? `<ul>${slice
          .map((row) => {
            const id = encodeURIComponent(row.id ?? row.slug);
            const seo = buildHairstyleImageSeo(row);
            const title = seo.pageTitle[locale] ?? seo.modelName;
            return `<li><a href="/explore/${id}">${escapeHtml(title)}</a></li>`;
          })
          .join("")}</ul>`
      : "";

  const hero = `<figure><img src="${escapeHtml(EXPLORE_LCP_HERO_SRC)}" width="768" height="1024" alt="${escapeHtml(copy.h1)}" loading="eager" fetchpriority="high" /><figcaption>${escapeHtml(copy.intro || copy.description)}</figcaption></figure>`;

  const core = buildPrerenderInner(copy.h1, copy.intro || copy.description, [
    { href: locale === "uz" ? "/explore" : `/${locale}/explore`, text: copy.ctaLabel },
    { href: "/morf-ai/try-on", text: "Try-on" },
  ]);

  const countNote =
    rows.length > 0
      ? `<p>${escapeHtml(String(rows.length))} ${locale === "ru" ? "стилей" : locale === "en" ? "styles" : "uslub"}.</p>`
      : "";

  return `${hero}${core}${countNote}${listHtml}`;
}