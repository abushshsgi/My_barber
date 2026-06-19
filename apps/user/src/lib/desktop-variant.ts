export type DesktopUiVariant = "classic" | "spread" | "horizon" | "atlas" | "luxe";

export const DESKTOP_UI_VARIANTS: DesktopUiVariant[] = [
  "classic",
  "spread",
  "horizon",
  "atlas",
  "luxe",
];

export const DESKTOP_VARIANT_STORAGE = "mysaloon.desktop.ui.variant.v3";

const LEGACY: Record<string, DesktopUiVariant> = {
  bazaar: "classic",
  voyage: "classic",
  reserve: "spread",
  atelier: "luxe",
  hub: "atlas",
  marketplace: "classic",
  dashboard: "atlas",
  editorial: "luxe",
};

export const BAZAAR_GREEN = "#059669";

export const desktopVariantMeta: Record<
  DesktopUiVariant,
  { label: string; hint: string }
> = {
  classic: {
    label: "Classic",
    hint: "Filter chap · 3 ustun grid · xarita o'ng",
  },
  spread: {
    label: "Spread",
    hint: "Yuqori filter · 4 ustun to'liq kenglik",
  },
  horizon: {
    label: "Horizon",
    hint: "Xarita strip yuqorida · grid pastda",
  },
  atlas: {
    label: "Atlas",
    hint: "Xarita chap 40% · ro'yxat o'ng",
  },
  luxe: {
    label: "Luxe",
    hint: "Featured qator · katta 2 ustun kartalar",
  },
};

export function readDesktopVariant(): DesktopUiVariant {
  if (typeof window === "undefined") return "classic";
  try {
    for (const key of [DESKTOP_VARIANT_STORAGE, "mysaloon.desktop.ui.variant.v2", "mysaloon.desktop.ui.variant"]) {
      const stored = localStorage.getItem(key);
      if (stored && DESKTOP_UI_VARIANTS.includes(stored as DesktopUiVariant)) {
        return stored as DesktopUiVariant;
      }
      if (stored && LEGACY[stored]) return LEGACY[stored];
    }
  } catch {
    /* noop */
  }
  return "classic";
}

export function saveDesktopVariant(variant: DesktopUiVariant) {
  try {
    localStorage.setItem(DESKTOP_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
