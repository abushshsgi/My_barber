import { DEFAULT_LOCALE, SITE_ORIGIN, type SeoLocale } from "./constants";

export function normalizePathname(pathname: string): string {
  const raw = (pathname.split("?")[0] ?? pathname).split("#")[0] || "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

export function parseLocaleFromPath(pathname: string): { locale: SeoLocale; pathWithoutLocale: string } {
  const path = normalizePathname(pathname);
  const m = path.match(/^\/(ru|en)(\/.*)?$/);
  if (!m) return { locale: DEFAULT_LOCALE, pathWithoutLocale: path };
  const suffix = m[2] ?? "";
  return { locale: m[1] as SeoLocale, pathWithoutLocale: suffix || "/" };
}

export function localePathPrefix(locale: SeoLocale): string {
  if (locale === "uz") return "";
  return `/${locale}`;
}

export function localizedPath(basePath: string, locale: SeoLocale): string {
  const p = basePath.startsWith("/") ? basePath : `/${basePath}`;
  if (locale === DEFAULT_LOCALE) return p === "/" ? "/" : p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

export function getCanonicalUrl(pathname: string, locale?: SeoLocale): string {
  const { locale: parsed, pathWithoutLocale } = parseLocaleFromPath(pathname);
  const loc = locale ?? parsed;
  return `${SITE_ORIGIN}${localizedPath(pathWithoutLocale, loc)}`;
}

export function absoluteUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${p}`;
}