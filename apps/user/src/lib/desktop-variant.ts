export type DesktopUiVariant = "marketplace" | "dashboard" | "editorial";

export const DESKTOP_UI_VARIANTS: DesktopUiVariant[] = ["marketplace", "dashboard", "editorial"];

export const DESKTOP_VARIANT_STORAGE = "mysaloon.desktop.ui.variant";

export const desktopVariantMeta: Record<
  DesktopUiVariant,
  { label: string; hint: string }
> = {
  marketplace: {
    label: "Marketplace",
    hint: "Airbnb/Booking — katta qidiruv, grid, filter",
  },
  dashboard: {
    label: "Dashboard",
    hint: "Notion/Linear — sidebar rail, jadval, KPI",
  },
  editorial: {
    label: "Editorial",
    hint: "Magazine — katta fotolar, premium",
  },
};

export function readDesktopVariant(): DesktopUiVariant {
  if (typeof window === "undefined") return "marketplace";
  try {
    const stored = localStorage.getItem(DESKTOP_VARIANT_STORAGE);
    if (stored && DESKTOP_UI_VARIANTS.includes(stored as DesktopUiVariant)) {
      return stored as DesktopUiVariant;
    }
  } catch {
    /* noop */
  }
  return "marketplace";
}

export function saveDesktopVariant(variant: DesktopUiVariant) {
  try {
    localStorage.setItem(DESKTOP_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
