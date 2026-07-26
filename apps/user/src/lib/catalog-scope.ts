/** Home / map katalog hududi — `all` = butun O‘zbekiston. */
export const CATALOG_SCOPE_ALL = "all" as const;

const STORAGE_KEY = "mysaloon_catalog_scope";

export type CatalogScopeValue = typeof CATALOG_SCOPE_ALL | string;

export function readCatalogScope(): CatalogScopeValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY)?.trim();
    return v || null;
  } catch {
    return null;
  }
}

export function writeCatalogScope(value: CatalogScopeValue): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* */
  }
}

export function isCatalogScopeAll(value: CatalogScopeValue | null | undefined): boolean {
  return !value || value === CATALOG_SCOPE_ALL;
}
