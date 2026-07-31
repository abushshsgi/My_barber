import type { Category } from "@/lib/mock-data";
import type { MapCategoryFilter } from "@/lib/map-filters";

/** Ikkalasi ham ixtiyoriy — `/map` ga oddiy havolalar parametrsiz ochiladi. */
export type MapRouteSearch = {
  q?: string;
  category?: MapCategoryFilter;
};

const CATEGORIES: Category[] = ["barber", "beauty", "nails"];

export function parseMapRouteSearch(search: Record<string, unknown>): MapRouteSearch {
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const rawCategory = typeof search.category === "string" ? search.category : "all";
  const category: MapCategoryFilter =
    rawCategory === "all" || CATEGORIES.includes(rawCategory as Category)
      ? (rawCategory as MapCategoryFilter)
      : "all";

  return { q, category };
}
