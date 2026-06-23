export const AUTH_DESKTOP_VARIANTS = [
  { id: "split", label: "01", desc: "Split klassik", family: "classic" },
  { id: "glass", label: "02", desc: "Glass markaz", family: "classic" },
  { id: "editorial", label: "03", desc: "Editorial", family: "editorial" },
  { id: "minimal", label: "04", desc: "Minimal", family: "classic" },
  { id: "studio", label: "05", desc: "Studio amber", family: "studio" },
  { id: "editorial-ink", label: "06", desc: "Editorial ink", family: "editorial" },
  { id: "editorial-sand", label: "07", desc: "Editorial sand", family: "editorial" },
  { id: "editorial-grid", label: "08", desc: "Editorial grid", family: "editorial" },
  { id: "editorial-quote", label: "09", desc: "Editorial quote", family: "editorial" },
  { id: "editorial-steps", label: "10", desc: "Editorial steps", family: "editorial" },
  { id: "studio-copper", label: "11", desc: "Studio copper", family: "studio" },
  { id: "studio-midnight", label: "12", desc: "Studio midnight", family: "studio" },
  { id: "studio-frame", label: "13", desc: "Studio frame", family: "studio" },
  { id: "studio-lounge", label: "14", desc: "Studio lounge", family: "studio" },
  { id: "studio-spotlight", label: "15", desc: "Studio spotlight", family: "studio" },
] as const;

export type AuthDesktopVariant = (typeof AUTH_DESKTOP_VARIANTS)[number]["id"];

export const AUTH_DESKTOP_VARIANT_IDS = AUTH_DESKTOP_VARIANTS.map((v) => v.id) as [
  AuthDesktopVariant,
  ...AuthDesktopVariant[],
];

export const DEFAULT_AUTH_DESKTOP_VARIANT: AuthDesktopVariant = "studio";

export function parseAuthDesktopVariant(raw: string | undefined): AuthDesktopVariant {
  const hit = AUTH_DESKTOP_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_DESKTOP_VARIANT;
}
