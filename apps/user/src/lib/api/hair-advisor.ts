import { apiFetch, apiJson } from "@/lib/api/client";

export type HairScanStatus =
  | "idle"
  | "requesting_permission"
  | "scanning"
  | "product_found"
  | "product_not_found"
  | "ingredients_required"
  | "processing_ocr"
  | "needs_confirmation"
  | "analyzing"
  | "completed"
  | "failed";

export type HairScan = {
  id: string;
  status: HairScanStatus | string;
  barcode: string;
  ingredients_draft: string[];
  ingredients_confirmed?: string[];
  catalog_tier?: "verified" | "unknown" | "provisional" | string;
  message_uz?: string;
  submission_allowed?: boolean;
  care_product?: {
    id: number;
    name: string;
    brand: string;
    image_url?: string | null;
    volume_ml?: number | null;
    country_of_origin?: string | null;
    barcode?: string | null;
    is_verified?: boolean;
    ingredients?: string[];
    ingredients_text?: string;
  };
  search_query?: string;
  message_uz?: string;
  recognition_meta?: {
    recognition_status?: "none" | "exact" | "ambiguous" | string;
    candidate_ids?: number[];
    ocr_brand?: string;
    ocr_product_name?: string;
    scan_method?: string;
    barcode_lookup_result?: string;
    [key: string]: unknown;
  };
  product_candidates?: Array<{
    id: number;
    name: string;
    brand: string;
    image_url?: string | null;
    volume_ml?: number | null;
    is_verified?: boolean;
    barcode?: string | null;
  }>;
};

export type HairScanDetail = HairScan & { analysis?: HairAnalysis };

export type HairAnalysisRecommendation = "POTENTIAL_MATCH" | "CAUTION" | "INSUFFICIENT_DATA";

export type HairAnalysis = {
  id: number;
  recommendation: HairAnalysisRecommendation | string;
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

export type HairRoutine = {
  id: number;
  name: string;
  is_current: boolean;
  notes: string;
  items: Array<{
    id: number;
    slot: string;
    care_product?: { id: number; name: string; brand: string };
  }>;
};

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function createHairScan(
  body: {
    input_method: string;
    barcode?: string;
    search_query?: string;
    image?: string;
    idempotency_key?: string;
  },
  opts?: { signal?: AbortSignal },
): Promise<HairScan> {
  return postJson("/api/v1/hair-advisor/scans/", body, opts?.signal);
}

export async function confirmHairScanIngredients(
  scanId: string,
  ingredients: string[],
): Promise<{ scan: HairScan; analysis: HairAnalysis }> {
  return postJson(`/api/v1/hair-advisor/scans/${scanId}/confirm-ingredients/`, { ingredients });
}

export async function confirmHairScanProduct(scanId: string, careProductId: number): Promise<HairScan> {
  return postJson(`/api/v1/hair-advisor/scans/${scanId}/confirm-product/`, {
    care_product_id: careProductId,
  });
}

export async function analyzeHairScan(scanId: string): Promise<HairAnalysis> {
  return postJson("/api/v1/hair-advisor/analyze/", { scan_id: scanId });
}

export type HairIngredientDetail = {
  inci_name: string;
  common_name: string;
  aliases: string[];
  category: string;
  role_uz: string;
  what_uz: string;
  benefits_uz: string;
  cautions_uz: string[];
  hair_uz: string;
  product_context_uz: string;
  evidence: Array<Record<string, unknown>>;
  evidence_status: string;
  known_curated: boolean;
};

export async function fetchHairIngredientDetail(inci: string, productName?: string): Promise<HairIngredientDetail> {
  const q = new URLSearchParams({ inci });
  if (productName) q.set("product_name", productName);
  return apiJson(`/api/v1/hair-advisor/ingredients/detail/?${q.toString()}`);
}

export async function fetchHairScan(scanId: string): Promise<HairScanDetail> {
  return apiJson(`/api/v1/hair-advisor/scans/${scanId}/`);
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

export async function fetchHairRoutineCurrent(): Promise<HairRoutine> {
  return apiJson("/api/v1/hair-advisor/routines/current/");
}

export async function patchHairRoutine(
  routineId: number,
  body: { name?: string; notes?: string },
): Promise<HairRoutine> {
  const res = await apiFetch(`/api/v1/hair-advisor/routines/${routineId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || res.statusText);
  }
  return res.json() as Promise<HairRoutine>;
}

export async function fetchProductSubmissions() {
  return apiJson("/api/v1/hair-advisor/submissions/");
}