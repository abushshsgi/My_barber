import type { Offer } from "@/lib/mock-data";

export type OfferFilter = "all" | "ending" | "nearby";

/** Bej + qora gradient — salon cover placeholder. */
export function salonCoverGradient(seed: string) {
  const n = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const light = 0.9 + (n % 6) * 0.012;
  const dark = 0.12 + (n % 5) * 0.02;
  return `linear-gradient(145deg, oklch(${light} 0.016 85) 0%, oklch(${dark} 0 0) 100%)`;
}

export function pickFeatured(list: Offer[]) {
  if (list.length === 0) return null;
  return [...list].sort((a, b) => b.discountPct - a.discountPct)[0];
}

export function filterOffers(list: Offer[], filter: OfferFilter): Offer[] {
  if (filter === "all") return list;
  if (filter === "ending") {
    return list.filter((o) => o.discountPct >= 25 || o.validUntil.startsWith("15") || o.validUntil.startsWith("20"));
  }
  return list;
}
