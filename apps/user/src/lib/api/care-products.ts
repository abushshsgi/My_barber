import { apiJson } from "./client";

export type CareProductCategory = "shampoo" | "balsam" | "mask" | "oil" | "spray" | "other";

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
  scalp_types?: string[];
  concerns?: string[];
  match_percent?: number | null;
  fit_verdict?: string | null;
  fit_reasons?: string[];
  usage_steps?: Array<{ title: string; desc: string; icon?: string }>;
  pros_uz: string;
  cons_uz: string;
  warnings_uz: string;
  is_published: boolean;
  sort_order: number;
};

export async function fetchCareProducts(params?: {
  q?: string;
  category?: string;
  recommended?: boolean;
}): Promise<CareProduct[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  if (params?.recommended) sp.set("recommended", "1");
  const q = sp.toString();
  return apiJson(`/api/v1/ai/care/products/${q ? `?${q}` : ""}`);
}

export async function fetchCareProduct(id: number): Promise<CareProduct> {
  return apiJson(`/api/v1/ai/care/products/${id}/`);
}

export type SosTime = "2min" | "5-10min" | "15min+";
export type SosIssue = "frizzy" | "oily" | "bedhead" | "dry";
export type SosTool =
  | "dryer"
  | "dry_shampoo"
  | "water_spray"
  | "comb"
  | "wax_gel"
  | "nothing";

export type SosFix = {
  title: string;
  steps: string[];
  suggested_hairstyle: string;
  pro_tip: string;
  source?: "ai" | "fallback" | string;
};

export async function generateSosFix(body: {
  time_available: SosTime;
  hair_issue: SosIssue[];
  tools_available: SosTool[];
}): Promise<SosFix> {
  const data = await apiJson<{ fix?: SosFix }>("/api/v1/ai/care/sos/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!data?.fix) throw new Error("Tezkor yechim javobi noto'g'ri.");
  return data.fix;
}

export async function fetchCareProductByBarcode(
  barcode: string,
  profile?: { condition?: string; texture?: string; color_status?: string; scalp?: string },
) {
  const sp = new URLSearchParams();
  if (profile?.condition) sp.set("condition", profile.condition);
  if (profile?.texture) sp.set("texture", profile.texture);
  if (profile?.color_status) sp.set("color_status", profile.color_status);
  if (profile?.scalp) sp.set("scalp", profile.scalp);
  const q = sp.toString();
  return apiJson(
    `/api/v1/products/barcode/${encodeURIComponent(barcode)}/${q ? `?${q}` : ""}`,
  );
}
