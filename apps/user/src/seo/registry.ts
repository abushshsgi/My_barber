import { LANDING_COPY, LANDING_PAGES, type LandingPageId } from "./content/landings";
import { DEFAULT_LOCALE, type SeoLocale } from "./constants";
import type { SeoBrand, SeoPageCopy, SeoResolvedPage } from "./types";
import { isNoindexPath } from "./noindex";
import { localizedPath, normalizePathname, parseLocaleFromPath } from "./url";

export function getLandingCopy(pageId: LandingPageId, locale: SeoLocale): SeoPageCopy {
  return LANDING_COPY[pageId][locale] ?? LANDING_COPY[pageId][DEFAULT_LOCALE];
}

export function getLandingById(id: LandingPageId) {
  return LANDING_PAGES.find((p) => p.id === id);
}

export function pathToLandingPageId(pathWithoutLocale: string): LandingPageId | null {
  const path = normalizePathname(pathWithoutLocale);
  const hit = LANDING_PAGES.find((p) => normalizePathname(p.uzPath) === path);
  return hit?.id ?? null;
}

function brandForPageId(id: LandingPageId): SeoBrand {
  return id.startsWith("morf-ai") ? "morf-ai" : "mysaloon";
}

export function resolveRegistryPage(pathname: string): SeoResolvedPage | null {
  const { locale, pathWithoutLocale } = parseLocaleFromPath(pathname);
  const pageId = pathToLandingPageId(pathWithoutLocale);
  if (!pageId) return null;

  const def = getLandingById(pageId);
  if (!def) return null;

  const path = normalizePathname(pathname);
  const indexable = def.indexable && !isNoindexPath(path);
  return {
    pageId,
    brand: brandForPageId(pageId),
    locale,
    path,
    indexable,
    sitemap: def.sitemap && indexable,
    copy: getLandingCopy(pageId, locale),
    hreflangCluster: def.trilingual ? pageId : undefined,
  };
}

export function localizedLandingPath(pageId: LandingPageId, locale: SeoLocale): string {
  const def = getLandingById(pageId);
  if (!def) return "/";
  return localizedPath(def.uzPath, locale);
}
