import { HREFLANG_LOCALES, ORG_LOGO, ORG_NAME, SITE_ORIGIN, type SeoLocale } from "./constants";
import {
  getLandingById,
  getLandingCopy,
  localizedLandingPath,
  resolveRegistryPage,
  type LandingPageId,
} from "./registry";
import { isNoindexPath } from "./noindex";
import { parseLocaleFromPath } from "./url";

export type HeadLink = { rel: string; href: string; hrefLang?: string };
export type HeadMeta = Record<string, string> & { title?: string };

export type BuiltHead = {
  meta: HeadMeta[];
  links: HeadLink[];
};

export function buildHreflangAlternates(clusterPageId: LandingPageId): HeadLink[] {
  const def = getLandingById(clusterPageId);
  if (!def?.trilingual) return [];

  const links: HeadLink[] = HREFLANG_LOCALES.map((locale) => ({
    rel: "alternate",
    href: `${SITE_ORIGIN}${localizedLandingPath(clusterPageId, locale)}`,
    hrefLang: locale === "uz" ? "uz" : locale,
  }));
  links.push({
    rel: "alternate",
    href: `${SITE_ORIGIN}${localizedLandingPath(clusterPageId, "uz")}`,
    hrefLang: "x-default",
  });
  return links;
}

export function buildRegistryHead(pageId: LandingPageId, locale: SeoLocale): BuiltHead {
  const copy = getLandingCopy(pageId, locale);
  const def = getLandingById(pageId);
  const path = localizedLandingPath(pageId, locale);
  const canonical = `${SITE_ORIGIN}${path}`;
  const indexable = def?.indexable !== false && !isNoindexPath(path);

  const meta: HeadMeta[] = [
    { title: copy.title },
    { name: "description", content: copy.description },
    ...(copy.keywords ? [{ name: "keywords", content: copy.keywords }] : []),
    { property: "og:title", content: copy.title },
    { property: "og:description", content: copy.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { property: "og:site_name", content: ORG_NAME },
    { property: "og:image", content: ORG_LOGO },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: copy.title },
    { name: "twitter:description", content: copy.description },
  ];

  if (!indexable) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  const links: HeadLink[] = [{ rel: "canonical", href: canonical }];
  if (def?.trilingual) {
    links.push(...buildHreflangAlternates(pageId));
  }

  return { meta, links };
}

export function buildDynamicHead(opts: {
  title: string;
  description: string;
  canonical: string;
  image?: string | null;
  noindex?: boolean;
  hreflangCluster?: LandingPageId;
  locale?: SeoLocale;
}): BuiltHead {
  const meta: HeadMeta[] = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: opts.canonical },
    { property: "og:site_name", content: ORG_NAME },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];

  if (opts.image) {
    meta.push(
      { property: "og:image", content: opts.image },
      { name: "twitter:image", content: opts.image },
    );
  } else {
    meta.push({ property: "og:image", content: ORG_LOGO });
  }

  if (opts.noindex || isNoindexPath(new URL(opts.canonical).pathname)) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  const links: HeadLink[] = [{ rel: "canonical", href: opts.canonical }];
  if (opts.hreflangCluster) {
    links.push(...buildHreflangAlternates(opts.hreflangCluster));
  }

  return { meta, links };
}

export function buildHeadForPathname(pathname: string): BuiltHead | null {
  const { locale } = parseLocaleFromPath(pathname);
  const resolved = resolveRegistryPage(pathname);
  if (!resolved?.copy) return null;
  return buildRegistryHead(resolved.pageId as LandingPageId, locale);
}
