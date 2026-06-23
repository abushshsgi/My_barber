export const AUTH_DESKTOP_VARIANTS = [
  {
    id: "split",
    label: "01 Split",
    desc: "Qora panel + forma — klassik",
  },
  {
    id: "glass",
    label: "02 Glass",
    desc: "Markazda shisha karta",
  },
  {
    id: "editorial",
    label: "03 Editorial",
    desc: "Keng hero, jurnal uslubi",
  },
  {
    id: "minimal",
    label: "04 Minimal",
    desc: "Oq, ixcham, premium",
  },
  {
    id: "studio",
    label: "05 Studio",
    desc: "Amber gradient, barber studio",
  },
] as const;

export type AuthDesktopVariant = (typeof AUTH_DESKTOP_VARIANTS)[number]["id"];

export const DEFAULT_AUTH_DESKTOP_VARIANT: AuthDesktopVariant = "split";

export function parseAuthDesktopVariant(raw: string | undefined): AuthDesktopVariant {
  const hit = AUTH_DESKTOP_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_DESKTOP_VARIANT;
}
