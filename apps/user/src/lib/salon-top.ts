import type { Salon } from "@/lib/mock-data";

/** Desktop kartochkadagi «Top tanlov» badge bilan bir xil chegara. */
export const TOP_SALON_MIN_RATING = 4.8;

export function isTopSalon(salon: Pick<Salon, "rating">): boolean {
  return salon.rating >= TOP_SALON_MIN_RATING;
}

export function filterTopSalons<T extends Pick<Salon, "rating">>(salons: T[]): T[] {
  return salons.filter(isTopSalon);
}
