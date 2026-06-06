export type OffersPageVariant = "v01" | "v02" | "v03";

export const OFFERS_PAGE_VARIANTS: OffersPageVariant[] = ["v01", "v02", "v03"];

export const OFFERS_VARIANT_STORAGE = "mysaloon.offers.variant";

export const offersVariantMeta: Record<
  OffersPageVariant,
  { labelKey: string; hintKey: string }
> = {
  v01: {
    labelKey: "offersPage.variants.v01",
    hintKey: "offersPage.hints.v01",
  },
  v02: {
    labelKey: "offersPage.variants.v02",
    hintKey: "offersPage.hints.v02",
  },
  v03: {
    labelKey: "offersPage.variants.v03",
    hintKey: "offersPage.hints.v03",
  },
};

export function readOffersVariant(): OffersPageVariant {
  if (typeof window === "undefined") return "v01";
  try {
    const stored = localStorage.getItem(OFFERS_VARIANT_STORAGE);
    if (stored && OFFERS_PAGE_VARIANTS.includes(stored as OffersPageVariant)) {
      return stored as OffersPageVariant;
    }
  } catch {
    /* noop */
  }
  return "v01";
}

export function saveOffersVariant(variant: OffersPageVariant) {
  try {
    localStorage.setItem(OFFERS_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
