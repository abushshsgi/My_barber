export type AiStylePageVariant = "v01" | "v02" | "v03";

export const AI_STYLE_PAGE_VARIANTS: AiStylePageVariant[] = ["v01", "v02", "v03"];

export const AI_STYLE_VARIANT_STORAGE = "mysaloon.aiStyle.variant";

export const aiStyleVariantMeta: Record<
  AiStylePageVariant,
  { labelKey: string; hintKey: string }
> = {
  v01: {
    labelKey: "aiStylePage.variants.v01",
    hintKey: "aiStylePage.hints.v01",
  },
  v02: {
    labelKey: "aiStylePage.variants.v02",
    hintKey: "aiStylePage.hints.v02",
  },
  v03: {
    labelKey: "aiStylePage.variants.v03",
    hintKey: "aiStylePage.hints.v03",
  },
};

export function readAiStyleVariant(): AiStylePageVariant {
  if (typeof window === "undefined") return "v01";
  try {
    const stored = localStorage.getItem(AI_STYLE_VARIANT_STORAGE);
    if (stored && AI_STYLE_PAGE_VARIANTS.includes(stored as AiStylePageVariant)) {
      return stored as AiStylePageVariant;
    }
  } catch {
    /* noop */
  }
  return "v01";
}

export function saveAiStyleVariant(variant: AiStylePageVariant) {
  try {
    localStorage.setItem(AI_STYLE_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
