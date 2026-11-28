import { pathRequiresAuth } from "@/lib/auth-routes";
import { normalizePathname, parseLocaleFromPath } from "@/seo/url";

/**
 * Explore katalog marshrutlari — auth currency, onboarding va session
 * chrome'siz yengil provider daraxti bilan yuklanadi.
 */
export function isPublicCatalogShellPath(pathname: string): boolean {
  const { pathWithoutLocale } = parseLocaleFromPath(pathname);
  return normalizePathname(pathWithoutLocale) === "/explore";
}

/** Explore dan tashqarida ham umumiy marketing katalog (keyingi bosqich). */
export function isPublicMarketingShellPath(pathname: string): boolean {
  const path = normalizePathname(pathname);
  if (isPublicCatalogShellPath(pathname)) return true;
  if (pathRequiresAuth(path)) return false;
  if (path === "/guides" || /^\/guides\/[^/]+$/.test(path)) return true;
  if (/^\/explore\/[^/]+$/.test(path) && !path.includes("/try")) return true;
  if (/^\/explore\/category\/[^/]+$/.test(path)) return true;
  return false;
}