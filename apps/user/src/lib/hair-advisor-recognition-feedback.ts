/** Hybrid Scanner V3 — user-facing recognition copy (UZ). */

export type RecognitionUiKey =
  | "product_identified"
  | "confirm_product"
  | "similar_products"
  | "image_quality_low"
  | "product_not_identified"
  | "service_unavailable"
  | "rescan";

const MESSAGES: Record<RecognitionUiKey, string> = {
  product_identified: "Mahsulot aniqlandi",
  confirm_product: "Mahsulotni tasdiqlang",
  similar_products: "O‘xshash mahsulotlar topildi",
  image_quality_low: "Rasm sifati yetarli emas",
  product_not_identified: "Mahsulotni aniqlab bo‘lmadi",
  service_unavailable: "Xizmat vaqtincha band. Qayta skanerlash",
  rescan: "Qayta skanerlash",
};

export function recognitionMessageFromMeta(meta: Record<string, unknown> | null | undefined): string {
  const key = meta?.ui_message_key;
  if (typeof key === "string" && key in MESSAGES) {
    return MESSAGES[key as RecognitionUiKey];
  }
  const status = meta?.recognition_status;
  if (status === "exact_match" || status === "exact") return MESSAGES.product_identified;
  if (status === "probable_match") return MESSAGES.confirm_product;
  if (status === "ambiguous") return MESSAGES.similar_products;
  if (status === "insufficient_image_quality") return MESSAGES.image_quality_low;
  if (status === "service_unavailable") return MESSAGES.service_unavailable;
  if (status === "not_found" || status === "none") return MESSAGES.product_not_identified;
  return "";
}

export function shouldRequireProductPick(meta: Record<string, unknown> | null | undefined): boolean {
  const status = meta?.recognition_status;
  return status === "ambiguous" || status === "probable_match";
}