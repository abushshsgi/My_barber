export const AI_STYLE_VARIANTS = ["mirror", "immersive", "wizard", "split", "bento"] as const;

export type AiStyleVariant = (typeof AI_STYLE_VARIANTS)[number];

const STORAGE_KEY = "mysaloon-ai-style-variant";

export function loadAiStyleVariant(): AiStyleVariant {
  if (typeof window === "undefined") return "mirror";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && AI_STYLE_VARIANTS.includes(saved as AiStyleVariant)) {
    return saved as AiStyleVariant;
  }
  return "mirror";
}

export function saveAiStyleVariant(variant: AiStyleVariant) {
  localStorage.setItem(STORAGE_KEY, variant);
}
