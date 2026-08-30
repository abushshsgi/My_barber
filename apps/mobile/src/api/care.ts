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
  likes_count?: number;
  liked_by_me?: boolean;
  scalp_types?: string[];
  concerns?: string[];
  match_percent?: number | null;
  fit_verdict?: string | null;
  fit_reasons?: string[];
  usage_steps?: Array<{ title: string; desc: string; icon?: string }>;
};

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type HairColorStatus = "natural" | "colored" | "bleached";

export type HairCareProfile = {
  condition: HairCondition | "";
  texture: HairTexture | "";
  color_status: HairColorStatus | "";
  scalp?: string;
  concerns?: string[];
  complete: boolean;
  completed_at: string | null;
  updated_at: string | null;
};

export type HairCareProfileUpdate = {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
  scalp?: string;
  concerns?: string[];
};

export async function fetchCareProducts(params?: {
  q?: string;
  category?: string;
  recommended?: boolean;
  order?: "likes" | "popular" | string;
  exclude_mine?: boolean;
  exclude_ids?: number[];
}): Promise<CareProduct[]> {
  return apiJson(
    `/api/v1/ai/care/products/${qs({
      q: params?.q,
      category: params?.category,
      recommended: params?.recommended ? "1" : undefined,
      order: params?.order,
      exclude_mine: params?.exclude_mine ? "1" : undefined,
      exclude_ids: params?.exclude_ids?.length
        ? params.exclude_ids.join(",")
        : undefined,
    })}`,
  );
}

export async function fetchCareProduct(id: number): Promise<CareProduct> {
  return apiJson(`/api/v1/ai/care/products/${id}/`);
}

export type CareProductBarcodeLookup = {
  found: boolean;
  source: "db" | "open_beauty_facts" | "upcitemdb" | string | null;
  barcode: string;
  country: {
    country_name: string;
    prefix: string;
    is_matched: boolean;
  };
  product: CareProduct & {
    title?: string;
    ingredients_raw?: string;
    country_of_origin?: string;
    country_code_prefix?: string;
    is_verified?: boolean;
  };
  match_percent?: number | null;
  fit_verdict?: string | null;
  fit_reasons?: string[];
  usage_steps?: Array<{ title: string; desc: string; icon?: string }>;
  safety_score?: number;
};

export async function fetchCareProductByBarcode(
  barcode: string,
  profile?: { condition?: string; texture?: string; color_status?: string; scalp?: string },
): Promise<CareProductBarcodeLookup> {
  const sp = new URLSearchParams();
  if (profile?.condition) sp.set("condition", profile.condition);
  if (profile?.texture) sp.set("texture", profile.texture);
  if (profile?.color_status) sp.set("color_status", profile.color_status);
  if (profile?.scalp) sp.set("scalp", profile.scalp);
  const q = sp.toString();
  return apiJson(`/api/v1/products/barcode/${encodeURIComponent(barcode)}/${q ? `?${q}` : ""}`);
}

export async function toggleCareProductLike(
  productId: number,
): Promise<{ liked: boolean; likes_count: number; product_id: number }> {
  return apiJson(`/api/v1/ai/care/products/${productId}/like/`, {
    method: "POST",
    body: "{}",
  });
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

export type AiCarePlanTask = {
  id: string;
  title: string;
  subtitle: string;
  time_hint?: string;
  icon: "water" | "flask" | "sparkles" | "shield" | "leaf" | "cut" | string;
  product_id?: number | null;
  product_name?: string;
};

export type AiCarePlan = {
  summary: string;
  morning: AiCarePlanTask[];
  evening: AiCarePlanTask[];
  weekly: AiCarePlanTask[];
  weekly_schedule: { day: string; task: string }[];
  tips: string[];
  avoid: string[];
};

export async function generateCarePlan(body: {
  condition: HairCondition;
  texture: HairTexture;
  color_status: HairColorStatus;
  products: {
    id: number;
    name: string;
    brand?: string;
    category?: string;
  }[];
}): Promise<AiCarePlan> {
  const res = await apiFetch("/api/v1/ai/care/plan/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | { plan?: AiCarePlan; detail?: string }
    | null;
  if (!res.ok) {
    throw new Error(
      data && typeof data.detail === "string" ? data.detail : "Parvarish reja yaratilmadi.",
    );
  }
  if (!data?.plan) throw new Error("Parvarish reja javobi noto'g'ri.");
  return data.plan;
}

export type MyCareProductApi = {
  id: number;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  source: string;
  added_at: string | null;
  save_id?: number;
};

export async function fetchMyCareProducts(): Promise<MyCareProductApi[]> {
  return apiJson("/api/v1/ai/care/my-products/");
}

export async function addMyCareProductApi(body: {
  product_id: number;
  source?: string;
}): Promise<MyCareProductApi> {
  return apiJson("/api/v1/ai/care/my-products/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function removeMyCareProductApi(productId: number): Promise<void> {
  await apiJson(`/api/v1/ai/care/my-products/${productId}/`, {
    method: "DELETE",
  });
}
