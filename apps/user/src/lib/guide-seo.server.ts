import { resolveFetchBase } from "@/lib/api/base-url";
import { buildDynamicHead, type HeadLink } from "@/seo/build-head";
import { SITE_ORIGIN, type SeoLocale } from "@/seo/constants";
import { breadcrumbJsonLd } from "@/seo/json-ld";
import { localizedPath } from "@/seo/url";

export type GuideArticleSeo = {
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  coverImage: string | null;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  ctaHref: string;
  ctaLabel: string;
  publishedLocales: SeoLocale[];
  jsonLd: unknown[];
};

function apiBase(): string {
  return resolveFetchBase("");
}

function isLocale(value: string): value is SeoLocale {
  return value === "uz" || value === "ru" || value === "en";
}

export function guideAlternates(slug: string, publishedLocales: string[]): HeadLink[] {
  const locales = publishedLocales.filter(isLocale);
  if (!locales.length) return [];
  const links: HeadLink[] = locales.map((locale) => ({
    rel: "alternate",
    href: `${SITE_ORIGIN}${localizedPath(`/guides/${slug}`, locale)}`,
    hrefLang: locale,
  }));
  const fallback = locales.includes("uz") ? "uz" : locales[0]!;
  links.push({
    rel: "alternate",
    href: `${SITE_ORIGIN}${localizedPath(`/guides/${slug}`, fallback)}`,
    hrefLang: "x-default",
  });
  return links;
}

export async function fetchGuideArticleSeo(
  slug: string,
  locale: SeoLocale = "uz",
): Promise<GuideArticleSeo | null> {
  try {
    const preview =
      typeof process !== "undefined" && process.env.CONTENT_DRAFT_PREVIEW === "1"
        ? "&preview=1"
        : "";
    const res = await fetch(
      `${apiBase()}/api/v1/content/articles/${encodeURIComponent(slug)}/?locale=${encodeURIComponent(locale)}${preview}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      seo_title?: string;
      meta_description?: string;
      excerpt?: string;
      cover_image_url?: string | null;
      cover_alt?: string;
      cover_width?: number;
      cover_height?: number;
      author?: string;
      conversion_cta_href?: string;
      conversion_cta_label?: string;
      status?: string;
      published_at?: string | null;
      updated_at?: string | null;
      published_locales?: string[];
    };
    const previewOn = preview.length > 0;
    if (!previewOn && data.status && data.status !== "published") return null;
    const title = data.title?.trim() || slug;
    const seoTitle = data.seo_title?.trim() || `${title} | MySaloon`;
    const metaDescription =
      data.meta_description?.trim() || data.excerpt?.trim() || `${title} — MySaloon.`;
    const excerpt = data.excerpt?.trim() || metaDescription;
    const cover = data.cover_image_url?.trim() || null;
    const coverImage = cover
      ? cover.startsWith("http")
        ? cover
        : `${SITE_ORIGIN}${cover.startsWith("/") ? cover : `/${cover}`}`
      : null;
    const canonicalPath = localizedPath(`/guides/${slug}`, locale);
    const canonical = `${SITE_ORIGIN}${canonicalPath}`;
    const guidesLabel =
      locale === "ru" ? "Руководства" : locale === "en" ? "Guides" : "Qo'llanmalar";
    const publishedLocales = (data.published_locales ?? []).filter(isLocale);
    return {
      title,
      seoTitle,
      metaDescription,
      excerpt,
      coverImage,
      coverAlt: data.cover_alt?.trim() || title,
      coverWidth: data.cover_width || 0,
      coverHeight: data.cover_height || 0,
      ctaHref: data.conversion_cta_href?.trim() || "/ai-style",
      ctaLabel: data.conversion_cta_label?.trim() || "Boshlash",
      publishedLocales,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "MySaloon", path: "/" },
          { name: guidesLabel, path: localizedPath("/guides", locale) },
          { name: title, path: canonicalPath },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description: metaDescription,
          inLanguage: locale,
          url: canonical,
          mainEntityOfPage: canonical,
          author: { "@type": "Organization", name: data.author?.trim() || "MySaloon tahririyati" },
          publisher: {
            "@type": "Organization",
            name: "MySaloon",
            url: SITE_ORIGIN,
          },
          ...(data.published_at ? { datePublished: data.published_at } : {}),
          ...(data.updated_at ? { dateModified: data.updated_at } : {}),
          ...(coverImage
            ? {
                image: {
                  "@type": "ImageObject",
                  url: coverImage,
                  contentUrl: coverImage,
                  caption: data.cover_alt?.trim() || title,
                  ...(data.cover_width ? { width: data.cover_width } : {}),
                  ...(data.cover_height ? { height: data.cover_height } : {}),
                },
              }
            : {}),
        },
      ],
    };
  } catch {
    return null;
  }
}

const INDEX_COPY: Record<SeoLocale, { title: string; description: string }> = {
  uz: {
    title: "Qo'llanmalar — soch parvarishi va Morf AI | mysaloon.uz",
    description:
      "Soch parvarishi, Morf AI, try-on va salon bron qilish bo'yicha mustaqil maqolalar.",
  },
  ru: {
    title: "Руководства — уход за волосами и Morf AI | mysaloon.uz",
    description: "Материалы об уходе за волосами, Morf AI и сервисах MySaloon.",
  },
  en: {
    title: "Guides — hair care and Morf AI | mysaloon.uz",
    description: "Independent articles on hair care, Morf AI, try-on, and booking a salon.",
  },
};

export function guideIndexHead(locale: SeoLocale) {
  const copy = INDEX_COPY[locale];
  const locales: SeoLocale[] = ["uz", "ru", "en"];
  return buildDynamicHead({
    title: copy.title,
    description: copy.description,
    canonical: `${SITE_ORIGIN}${localizedPath("/guides", locale)}`,
    alternates: [
      ...locales.map((item) => ({
        rel: "alternate",
        href: `${SITE_ORIGIN}${localizedPath("/guides", item)}`,
        hrefLang: item,
      })),
      {
        rel: "alternate",
        href: `${SITE_ORIGIN}${localizedPath("/guides", "uz")}`,
        hrefLang: "x-default",
      },
    ],
  });
}

export function guideHead(article: GuideArticleSeo, slug: string, locale: SeoLocale) {
  const canonical = `${SITE_ORIGIN}${localizedPath(`/guides/${slug}`, locale)}`;
  return buildDynamicHead({
    title: article.seoTitle,
    description: article.metaDescription,
    canonical,
    image: article.coverImage,
    imageAlt: article.coverAlt,
    imageWidth: article.coverWidth || null,
    imageHeight: article.coverHeight || null,
    ogType: "article",
    noindex: article.publishedLocales.length === 0,
    alternates: guideAlternates(slug, article.publishedLocales),
  });
}
