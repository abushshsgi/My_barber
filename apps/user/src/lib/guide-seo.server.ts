import { resolveFetchBase } from "@/lib/api/base-url";
import { SITE_ORIGIN } from "@/seo/constants";
import { breadcrumbJsonLd } from "@/seo/json-ld";

export type GuideArticleSeo = {
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  coverImage: string | null;
  ctaHref: string;
  ctaLabel: string;
  jsonLd: unknown[];
};

function apiBase(): string {
  return resolveFetchBase("");
}

export async function fetchGuideArticleSeo(
  slug: string,
  locale = "uz",
): Promise<GuideArticleSeo | null> {
  try {
    const res = await fetch(
      `${apiBase()}/api/v1/content/articles/${encodeURIComponent(slug)}/?locale=${encodeURIComponent(locale)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      seo_title?: string;
      meta_description?: string;
      excerpt?: string;
      cover_image_url?: string | null;
      conversion_cta_href?: string;
      conversion_cta_label?: string;
      status?: string;
    };
    if (data.status && data.status !== "published") return null;
    const title = data.title?.trim() || slug;
    const seoTitle = data.seo_title?.trim() || `${title} | MySaloon`;
    const metaDescription =
      data.meta_description?.trim() || data.excerpt?.trim() || `${title} — MySaloon qo'llanmasi.`;
    const excerpt = data.excerpt?.trim() || metaDescription;
    const cover = data.cover_image_url?.trim() || null;
    const coverImage = cover
      ? cover.startsWith("http")
        ? cover
        : `${SITE_ORIGIN}${cover.startsWith("/") ? cover : `/${cover}`}`
      : `${SITE_ORIGIN}/brand-logo.png`;
    const ctaHref = data.conversion_cta_href?.trim() || "/ai-style";
    const ctaLabel = data.conversion_cta_label?.trim() || "Boshlash";
    const canonical = `${SITE_ORIGIN}/guides/${encodeURIComponent(slug)}`;
    return {
      title,
      seoTitle,
      metaDescription,
      excerpt,
      coverImage,
      ctaHref,
      ctaLabel,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "MySaloon", path: "/" },
          { name: "Qo'llanmalar", path: "/guides" },
          { name: title, path: `/guides/${encodeURIComponent(slug)}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description: metaDescription,
          url: canonical,
          image: coverImage,
        },
      ],
    };
  } catch {
    return null;
  }
}
