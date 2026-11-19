import { apiFetch, apiJson } from "@/lib/api/client";

export type HairScan = {
  id: string;
  status: string;
  barcode: string;
  ingredients_draft: string[];
  catalog_tier?: string;
  message_uz?: string;
  submission_allowed?: boolean;
  care_product?: { id: number; name: string; brand: string; image_url?: string };
};

export type HairAnalysis = {
  id: number;
  recommendation: string;
  explanation_uz: string;
  data_confidence: string;
  result: {
    ingredients?: string[];
    catalog_tier?: string;
    disclaimer_uz?: string;
    key_ingredients?: Array<Record<string, unknown>>;
    explanation?: { summary_bullets_uz?: string[]; cautions_uz?: string[] };
  };
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function createHairScan(body: {
  input_method: string;
  barcode?: string;
  search_query?: string;
  image?: string;
}): Promise<HairScan> {
  return postJson("/api/v1/hair-advisor/scans/", body);
}

export async function confirmHairScanIngredients(
  scanId: string,
  ingredients: string[],
): Promise<{ scan: HairScan; analysis: HairAnalysis }> {
  return postJson(`/api/v1/hair-advisor/scans/${scanId}/confirm-ingredients/`, { ingredients });
}

export async function fetchHairScanHistory(): Promise<HairScan[]> {
  return apiJson("/api/v1/hair-advisor/history/");
}

export async function createProductSubmission(body: Record<string, unknown>) {
  return postJson("/api/v1/hair-advisor/submissions/", body);
}

export async function submitHairFeedback(body: {
  analysis_id: number;
  helpful?: boolean;
  comment?: string;
}) {
  return postJson("/api/v1/hair-advisor/feedback/", body);
}

export async function compareHairProducts(careProductIds: number[]) {
  return postJson<{ result: Record<string, unknown> }>("/api/v1/hair-advisor/compare/", {
    care_product_ids: careProductIds,
  });
}

export async function addHairRoutineProduct(body: { care_product_id: number; slot?: string }) {
  return postJson("/api/v1/hair-advisor/routines/", body);
}

export async function fetchHairRoutineCurrent() {
  return apiJson("/api/v1/hair-advisor/routines/current/");
}

export async function fetchProductSubmissions() {
  return apiJson("/api/v1/hair-advisor/submissions/");
}