import type { BarberDiscovery } from "@/lib/mappers/barber";
import type { MapFiltersState } from "@/lib/map-filters";

function matchesPrice(barber: BarberDiscovery, bucket: MapFiltersState["price"]): boolean {
  if (bucket === "any") return true;
  const p = barber.priceFrom;
  if (p <= 0) return false;
  if (bucket === "under100") return p < 100_000;
  if (bucket === "100-200") return p >= 100_000 && p < 200_000;
  if (bucket === "200-500") return p >= 200_000 && p < 500_000;
  return p >= 500_000;
}

function matchesRating(barber: BarberDiscovery, min: MapFiltersState["ratingMin"]): boolean {
  if (min === "any") return true;
  return barber.rating >= parseFloat(min);
}

function matchesDistance(barber: BarberDiscovery, max: MapFiltersState["distanceMax"]): boolean {
  if (max === "any") return true;
  if (!Number.isFinite(barber.distanceKm) || barber.distanceKm <= 0) return false;
  return barber.distanceKm <= parseFloat(max);
}

function matchesAmenities(barber: BarberDiscovery, codes: string[]): boolean {
  if (codes.length === 0) return true;
  const have = new Set(barber.amenities.map((a) => a.code));
  return codes.every((code) => have.has(code));
}

function matchesGuestFavorite(barber: BarberDiscovery, enabled: boolean): boolean {
  if (!enabled) return true;
  return barber.rating >= 4.8 && barber.reviewCount >= 5;
}

export function applyMapBarberFilters(
  barbers: BarberDiscovery[],
  filters: MapFiltersState,
): BarberDiscovery[] {
  return barbers.filter(
    (b) =>
      matchesPrice(b, filters.price) &&
      matchesRating(b, filters.ratingMin) &&
      matchesDistance(b, filters.distanceMax) &&
      matchesAmenities(b, filters.amenities) &&
      matchesGuestFavorite(b, filters.guestFavorite),
  );
}
