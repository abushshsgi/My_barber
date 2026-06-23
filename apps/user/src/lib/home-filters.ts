import type { Salon } from "@/lib/mock-data";
import {
  DEFAULT_MAP_FILTERS,
  applyMapSalonFilters,
  type MapDistanceMax,
  type MapPriceBucket,
  type MapRatingMin,
} from "@/lib/map-filters";

export type HomeSort = "recommended" | "rating" | "distance" | "price";

export type HomeSidebarFilters = {
  ratingMin: MapRatingMin;
  distanceMax: MapDistanceMax;
  price: MapPriceBucket;
  guestFavorite: boolean;
  sort: HomeSort;
};

export const DEFAULT_HOME_SIDEBAR_FILTERS: HomeSidebarFilters = {
  ratingMin: "any",
  distanceMax: "any",
  price: "any",
  guestFavorite: false,
  sort: "recommended",
};

export function applyHomeSidebarFilters(salons: Salon[], filters: HomeSidebarFilters): Salon[] {
  const idOrder = new Map(salons.map((s, i) => [s.id, i]));
  let list = applyMapSalonFilters(salons, {
    ...DEFAULT_MAP_FILTERS,
    price: filters.price,
    ratingMin: filters.ratingMin,
    distanceMax: filters.distanceMax,
    guestFavorite: filters.guestFavorite,
  });

  if (filters.sort === "rating") {
    list = [...list].sort((a, b) => b.rating - a.rating);
  } else if (filters.sort === "distance") {
    list = [...list].sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (filters.sort === "price") {
    list = [...list].sort((a, b) => a.priceFrom - b.priceFrom);
  } else {
    list = [...list].sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
  }

  return list;
}

export function countActiveHomeFilters(filters: HomeSidebarFilters): number {
  let n = 0;
  if (filters.ratingMin !== "any") n += 1;
  if (filters.distanceMax !== "any") n += 1;
  if (filters.price !== "any") n += 1;
  if (filters.guestFavorite) n += 1;
  if (filters.sort !== "recommended") n += 1;
  return n;
}
