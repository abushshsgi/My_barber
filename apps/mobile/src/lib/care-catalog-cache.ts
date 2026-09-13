import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchCareProducts, type CareProduct } from "../api/care";

const STORAGE_KEY = "mysaloon.care.catalog.v2";

/** In-memory + disk — hub ochilganda Unsplash demo o‘rniga darrov bizning mahsulotlar. */
let cached: CareProduct[] | null = null;
let inflight: Promise<CareProduct[]> | null = null;
let hydratePromise: Promise<CareProduct[]> | null = null;

export function getCareCatalogCache(): CareProduct[] | null {
  return cached;
}

export function setCareCatalogCache(rows: CareProduct[]): void {
  if (!rows.length) return;
  cached = rows;
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rows)).catch(() => undefined);
}

/** Diskdan sinxron emas — birinchi freymda chaqiriladi. */
export function hydrateCareCatalogCache(): Promise<CareProduct[]> {
  if (cached?.length) return Promise.resolve(cached);
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return cached ?? [];
      const parsed = JSON.parse(raw) as CareProduct[];
      if (Array.isArray(parsed) && parsed.length) {
        cached = parsed;
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return cached ?? [];
  })().finally(() => {
    hydratePromise = null;
  });
  return hydratePromise;
}

type PrefetchOpts = {
  force?: boolean;
  recommended?: boolean;
  order?: "likes" | "popular" | string;
  exclude_mine?: boolean;
};

/**
 * Birinchi chaqiriqda network; keyin cache qaytarib fonda yangilaydi.
 * Hub uchun `recommended: true` — demo emas, bizning katalog.
 */
export function prefetchCareCatalog(opts?: PrefetchOpts): Promise<CareProduct[]> {
  const recommended = opts?.recommended ?? true;
  const order = opts?.order;
  const excludeMine = opts?.exclude_mine ?? false;

  if (!opts?.force && cached?.length) {
    // Stale-while-revalidate
    void refreshInBackground({ recommended, order, excludeMine });
    return Promise.resolve(cached);
  }
  if (inflight) return inflight;

  inflight = fetchCareProducts({
    recommended: recommended || undefined,
    order,
    exclude_mine: excludeMine || undefined,
  })
    .then((rows) => {
      if (rows.length) setCareCatalogCache(rows);
      return rows.length ? rows : cached ?? [];
    })
    .catch((err) => {
      if (cached?.length) return cached;
      throw err;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function refreshInBackground(opts: {
  recommended: boolean;
  order?: string;
  excludeMine: boolean;
}) {
  if (inflight) return;
  inflight = fetchCareProducts({
    recommended: opts.recommended || undefined,
    order: opts.order,
    exclude_mine: opts.excludeMine || undefined,
  })
    .then((rows) => {
      if (rows.length) setCareCatalogCache(rows);
      return rows;
    })
    .catch(() => cached ?? [])
    .finally(() => {
      inflight = null;
    });
}
