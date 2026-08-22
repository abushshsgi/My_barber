import { apiFetch, apiJson, qs } from "./client";

export type CareProductCategory =
  | "shampoo"
  | "balsam"
  | "mask"
  | "oil"
  | "spray"
  | "other";

export type CareProduct = {
  id: number;
  name: string;
  brand: string;
  slug: string;
  category: CareProductCategory | string;
  image_url: string | null;
  ingredients_text: string;
  ingredients: string[];
  usage_uz: string;
  purpose_uz: string;
  suitable_for: string[];
  not_suitable_for: string[];
  pros_uz: string;
  cons_uz: string;
  warnings_uz: string;
  is_published: boolean;
  sort_order: number;
};

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type HairColorStatus = "natural" | "colored" | "bleached";

export type HairCareProfile = {
  condition: HairCondition | "";
  texture: HairTexture | "";
  color_status: HairColorStatus | "";
  complete: boolean;
  completed_at: string | null;
  updated_at: string | null;
};

export type HairCareProfileUpdate = {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
};

export async function fetchCareProducts(params?: {
  q?: string;
  category?: string;
  recommended?: boolean;
}): Promise<CareProduct[]> {
  return apiJson(
    `/api/v1/ai/care/products/${qs({
      q: params?.q,
      category: params?.category,
      recommended: params?.recommended ? "1" : undefined,
    })}`,
  );
}

export async function fetchCareProduct(id: number): Promise<CareProduct> {
  return apiJson(`/api/v1/ai/care/products/${id}/`);
}

export async function fetchHairCareProfile(): Promise<HairCareProfile> {
  return apiJson("/api/v1/users/me/hair-care-profile/");
}

export async function updateHairCareProfile(
  body: HairCareProfileUpdate,
): Promise<HairCareProfile> {
  return apiJson("/api/v1/users/me/hair-care-profile/", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export type IngredientScanAlert = {
  type: string;
  ingredient: string;
  severity: "low" | "medium" | "high" | string;
  message_uz: string;
};

export type IngredientScanBeneficial = {
  ingredient: string;
  reason_uz: string;
};

export type IngredientScanResponse = {
  product_analysis: {
    safety_score: number;
    verdict: string;
    total_ingredients_count: number;
    product_name?: string;
    brand?: string;
  };
  ingredients: string[];
  critical_alerts: IngredientScanAlert[];
  beneficial_ingredients: IngredientScanBeneficial[];
  verdict?: "good" | "caution" | "bad" | "dangerous" | string;
  verdict_key?: string;
  match_score?: number;
  flags?: string[];
  good_flags?: string[];
  bad_flags?: string[];
  dangerous_flags?: string[];
  matched_product_id?: number | null;
  fit_uz?: string;
  catalog_notes_uz?: string;
  matched_product?: {
    id: number;
    name: string;
    brand: string;
    category: string;
    image_url: string | null;
    usage_uz: string;
    purpose_uz: string;
    pros_uz: string;
    cons_uz: string;
    warnings_uz: string;
  } | null;
};

export async function scanIngredient(image: string): Promise<IngredientScanResponse> {
  const res = await apiFetch("/api/v1/ai/ingredient-scan/", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
  const body = (await res.json().catch(() => null)) as
    | IngredientScanResponse
    | { detail?: string }
    | null;
  if (!res.ok) {
    const detail =
      body && typeof body === "object" && typeof (body as { detail?: string }).detail === "string"
        ? (body as { detail: string }).detail
        : "Tarkib tahlili muvaffaqiyatsiz.";
    throw new Error(detail);
  }
  if (!body || typeof body !== "object" || !("product_analysis" in body)) {
    throw new Error("Tarkib tahlili javobi noto'g'ri.");
  }
  return body as IngredientScanResponse;
}
