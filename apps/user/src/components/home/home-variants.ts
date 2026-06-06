export type HomePageVariant = "v01" | "v02" | "v03";

export const HOME_PAGE_VARIANTS: HomePageVariant[] = ["v01", "v02", "v03"];

export const HOME_VARIANT_STORAGE = "mysaloon.home.variant";

export const homeVariantMeta: Record<
  HomePageVariant,
  { labelKey: string; hintKey: string }
> = {
  v01: {
    labelKey: "homePage.variants.v01",
    hintKey: "homePage.hints.v01",
  },
  v02: {
    labelKey: "homePage.variants.v02",
    hintKey: "homePage.hints.v02",
  },
  v03: {
    labelKey: "homePage.variants.v03",
    hintKey: "homePage.hints.v03",
  },
};

export function readHomeVariant(): HomePageVariant {
  if (typeof window === "undefined") return "v01";
  try {
    const stored = localStorage.getItem(HOME_VARIANT_STORAGE);
    if (stored && HOME_PAGE_VARIANTS.includes(stored as HomePageVariant)) {
      return stored as HomePageVariant;
    }
  } catch {
    /* noop */
  }
  return "v01";
}

export function saveHomeVariant(variant: HomePageVariant) {
  try {
    localStorage.setItem(HOME_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
