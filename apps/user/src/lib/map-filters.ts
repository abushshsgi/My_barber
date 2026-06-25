import type { Category, Salon } from "@/lib/mock-data";

export type MapPriceBucket = "any" | "under100" | "100-200" | "200-500" | "500plus";
export type MapRatingMin = "any" | "4.5" | "4.0" | "3.5";
export type MapDistanceMax = "any" | "1" | "3" | "5" | "10";
export type MapCategoryFilter = "all" | Category;

export type MapFiltersState = {
  price: MapPriceBucket;
  ratingMin: MapRatingMin;
  category: MapCategoryFilter;
  amenities: string[];
  distanceMax: MapDistanceMax;
  guestFavorite: boolean;
};

export const DEFAULT_MAP_FILTERS: MapFiltersState = {
  price: "any",
  ratingMin: "any",
  category: "all",
  amenities: [],
  distanceMax: "any",
  guestFavorite: false,
};

export const MAP_AMENITY_CODES = [
  "wifi",
  "parking",
  "card_payment",
  "air_conditioning",
  "waiting_area",
  "coffee_tea",
  "online_booking",
  "sanitized_tools",
  "kids_friendly",
] as const;

function salonAmenityCodes(salon: Salon): Set<string> {
  return new Set(salon.amenities.map((a) => a.code));
}

function matchesPrice(salon: Salon, bucket: MapPriceBucket): boolean {
  if (bucket === "any") return true;
  const p = salon.priceFrom;
  if (p <= 0) return false;
  if (bucket === "under100") return p < 100_000;
  if (bucket === "100-200") return p >= 100_000 && p < 200_000;
  if (bucket === "200-500") return p >= 200_000 && p < 500_000;
  return p >= 500_000;
}

function matchesRating(salon: Salon, min: MapRatingMin): boolean {
  if (min === "any") return true;
  return salon.rating >= parseFloat(min);
}

function matchesDistance(salon: Salon, max: MapDistanceMax): boolean {
  if (max === "any") return true;
  if (!Number.isFinite(salon.distanceKm) || salon.distanceKm <= 0) return false;
  return salon.distanceKm <= parseFloat(max);
}

function matchesCategory(salon: Salon, category: MapCategoryFilter): boolean {
  if (category === "all") return true;
  return salon.category === category;
}

function matchesAmenities(salon: Salon, codes: string[]): boolean {
  if (codes.length === 0) return true;
  const have = salonAmenityCodes(salon);
  return codes.every((code) => have.has(code));
}

function matchesGuestFavorite(salon: Salon, enabled: boolean): boolean {
  if (!enabled) return true;
  return salon.rating >= 4.8 && salon.reviewCount >= 5;
}

export function applyMapSalonFilters(salons: Salon[], filters: MapFiltersState): Salon[] {
  return salons.filter(
    (s) =>
      matchesPrice(s, filters.price) &&
      matchesRating(s, filters.ratingMin) &&
      matchesCategory(s, filters.category) &&
      matchesAmenities(s, filters.amenities) &&
      matchesDistance(s, filters.distanceMax) &&
      matchesGuestFavorite(s, filters.guestFavorite),
  );
}

export function countActiveMapFilters(filters: MapFiltersState): number {
  let n = 0;
  if (filters.price !== "any") n += 1;
  if (filters.ratingMin !== "any") n += 1;
  if (filters.category !== "all") n += 1;
  if (filters.amenities.length > 0) n += 1;
  if (filters.distanceMax !== "any") n += 1;
  if (filters.guestFavorite) n += 1;
  return n;
}

export function serializeMapFilters(filters: MapFiltersState): string {
  return JSON.stringify(filters);
}
