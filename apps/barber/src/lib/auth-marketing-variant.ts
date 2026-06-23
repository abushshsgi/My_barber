/** Chap marketing panel — 5 ta layout (faqat signup + yo'l tanlanganda). */
export const AUTH_MARKETING_VARIANTS = [
  { id: "icon-short", label: "01", desc: "Icon + qisqa" },
  { id: "icon-bullets", label: "02", desc: "Icon + ro'yxat" },
  { id: "image-long", label: "03", desc: "Rasm + uzun matn" },
  { id: "cards-grid", label: "04", desc: "Kartochkalar" },
  { id: "full-mix", label: "05", desc: "Hammasi birga" },
] as const;

export type AuthMarketingVariant = (typeof AUTH_MARKETING_VARIANTS)[number]["id"];

export const AUTH_MARKETING_VARIANT_IDS = AUTH_MARKETING_VARIANTS.map((v) => v.id) as [
  AuthMarketingVariant,
  ...AuthMarketingVariant[],
];

export const DEFAULT_AUTH_MARKETING_VARIANT: AuthMarketingVariant = "icon-bullets";

export function parseAuthMarketingVariant(raw: string | undefined): AuthMarketingVariant {
  const hit = AUTH_MARKETING_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_MARKETING_VARIANT;
}
