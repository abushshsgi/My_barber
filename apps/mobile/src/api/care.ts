import { apiJson, qs } from "./client";

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
