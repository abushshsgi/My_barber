export type DesktopUiVariant = "voyage" | "reserve" | "atelier" | "hub" | "bazaar";

export const DESKTOP_UI_VARIANTS: DesktopUiVariant[] = [
  "voyage",
  "reserve",
  "atelier",
  "hub",
  "bazaar",
];

export const DESKTOP_VARIANT_STORAGE = "mysaloon.desktop.ui.variant.v2";

const LEGACY: Record<string, DesktopUiVariant> = {
  marketplace: "voyage",
  dashboard: "hub",
  editorial: "atelier",
};

export const desktopVariantMeta: Record<
  DesktopUiVariant,
  { label: string; hint: string; accent: string }
> = {
  voyage: {
    label: "Voyage",
    hint: "Airbnb — qidiruv pill, scroll qatorlar",
    accent: "#E61E4D",
  },
  reserve: {
    label: "Reserve",
    hint: "Booking.com — ko'k header, grid",
    accent: "#003580",
  },
  atelier: {
    label: "Atelier",
    hint: "Magazine — katta hero, asymmetrik",
    accent: "#1a1a1a",
  },
  hub: {
    label: "Hub",
    hint: "Linear — qora rail, jadval, KPI",
    accent: "#171717",
  },
  bazaar: {
    label: "Bazaar",
    hint: "Filter + grid + xarita panel",
    accent: "#059669",
  },
};

export function readDesktopVariant(): DesktopUiVariant {
  if (typeof window === "undefined") return "voyage";
  try {
    const stored = localStorage.getItem(DESKTOP_VARIANT_STORAGE);
    if (stored && DESKTOP_UI_VARIANTS.includes(stored as DesktopUiVariant)) {
      return stored as DesktopUiVariant;
    }
    const legacy = localStorage.getItem("mysaloon.desktop.ui.variant");
    if (legacy && LEGACY[legacy]) return LEGACY[legacy];
  } catch {
    /* noop */
  }
  return "voyage";
}

export function saveDesktopVariant(variant: DesktopUiVariant) {
  try {
    localStorage.setItem(DESKTOP_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
