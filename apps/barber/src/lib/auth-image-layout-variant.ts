/** Chap panel — rasm joylashuvi (matn #02 icon-bullets doim bir xil). */
export const AUTH_IMAGE_LAYOUT_VARIANTS = [
  { id: "left-strip", label: "01", desc: "Chapda rasm" },
  { id: "right-strip", label: "02", desc: "O'ngda rasm" },
  { id: "top-hero", label: "03", desc: "Yuqori banner" },
  { id: "bottom-card", label: "04", desc: "Pastda rasm" },
  { id: "bg-watermark", label: "05", desc: "Fon watermark" },
  { id: "float-tr", label: "06", desc: "Suzuvchi o'ng" },
  { id: "split-equal", label: "07", desc: "50/50 split" },
  { id: "corner-accent", label: "08", desc: "Burchak accent" },
  { id: "mid-inset", label: "09", desc: "O'rtada inset" },
  { id: "tall-hero", label: "10", desc: "Uzun hero" },
] as const;

export type AuthImageLayoutVariant = (typeof AUTH_IMAGE_LAYOUT_VARIANTS)[number]["id"];

export const AUTH_IMAGE_LAYOUT_IDS = AUTH_IMAGE_LAYOUT_VARIANTS.map((v) => v.id) as [
  AuthImageLayoutVariant,
  ...AuthImageLayoutVariant[],
];

export const DEFAULT_AUTH_IMAGE_LAYOUT: AuthImageLayoutVariant = "left-strip";

export function parseAuthImageLayout(raw: string | undefined): AuthImageLayoutVariant {
  const hit = AUTH_IMAGE_LAYOUT_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_IMAGE_LAYOUT;
}
