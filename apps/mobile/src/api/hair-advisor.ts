import { apiJson } from "./client";
import type { CareProduct } from "./care";

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
  status: HairScanStatus;
  input_method: string;
  barcode: string;
  search_query: string;
  ingredients_draft: string[];
  ingredients_confirmed: string[];
  ingredients_confirmed_at: string | null;
  lookup_source?: string;
  error_code?: string;
  error_message?: string;
  analysis_id?: number | null;
  care_product?: CareProduct & Record<string, unknown>;
  product_id?: number | null;
  created_at?: string;
  catalog_tier?: "verified" | "unknown" | "provisional";
  message_uz?: string;
  submission_allowed?: boolean;
  verified_at?: string | null;
};

export type HairAnalysisRecommendation = "POTENTIAL_MATCH" | "CAUTION" | "INSUFFICIENT_DATA";

export type HairAnalysis = {
  id: number;
  scan_id: string;
  recommendation: HairAnalysisRecommendation;
  result: {
    product?: Record<string, unknown>;
    ingredients?: string[];
    explanation_uz?: string;
    explanation?: {
      explanation_uz?: string;
      summary_bullets_uz?: string[];
      cautions_uz?: string[];
      provider?: string;
    };
    hair_fit?: Record<string, unknown>;
    key_ingredients?: Array<Record<string, unknown>>;
    evidence?: Array<Record<string, unknown>>;
    safety_score?: number;
    recommendation?: string;
    limitations?: string[];
    catalog_fit?: Record<string, unknown>;
    catalog_tier?: string;
    disclaimer_uz?: string;
  };
  explanation_uz: string;
  data_confidence: string;
  created_at?: string;
};

export type HairScanDetail = HairScan & { analysis?: HairAnalysis };

export type ProductComparisonResult = {
  id: number;
  care_product_ids: number[];
  result: Record<string, unknown>;
  data_quality_note: string;
  created_at: string;
};

export type HairRoutine = {
  id: number;
  name: string;
  is_current: boolean;
  notes: string;
  items: Array<{
    id: number;
    slot: string;
    care_product?: CareProduct;
  }>;
};

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return apiJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createHairScan(body: {
  input_method: string;
  barcode?: string;
  search_query?: string;
  ingredients?: string[];
  image?: string;
  idempotency_key?: string;
}): Promise<HairScan> {
  return postJson("/api/v1/hair-advisor/scans/", body);
}

export async function fetchHairScan(scanId: string): Promise<HairScanDetail> {
  return apiJson(`/api/v1/hair-advisor/scans/${scanId}/`);
}

export async function confirmHairScanIngredients(
  scanId: string,
  ingredients: string[],
): Promise<{ scan: HairScan; analysis: HairAnalysis }> {
  return postJson(`/api/v1/hair-advisor/scans/${scanId}/confirm-ingredients/`, { ingredients });
}

export async function analyzeHairScan(scanId: string): Promise<HairAnalysis> {
  return postJson("/api/v1/hair-advisor/analyze/", { scan_id: scanId });
}

export async function compareHairProducts(careProductIds: number[]): Promise<ProductComparisonResult> {
  return postJson("/api/v1/hair-advisor/compare/", { care_product_ids: careProductIds });
}

export async function fetchHairScanHistory(): Promise<HairScan[]> {
  return apiJson("/api/v1/hair-advisor/history/");
}

export async function submitHairFeedback(body: {
  analysis_id: number;
  helpful?: boolean | null;
  comment?: string;
}): Promise<unknown> {
  return postJson("/api/v1/hair-advisor/feedback/", body);
}

export async function addHairRoutineProduct(body: {
  care_product_id: number;
  slot?: string;
  name?: string;
}): Promise<HairRoutine> {
  return postJson("/api/v1/hair-advisor/routines/", body);
}

export async function fetchHairRoutineCurrent(): Promise<HairRoutine> {
  return apiJson("/api/v1/hair-advisor/routines/current/");
}

export type ProductSubmission = {
  id: string;
  status: string;
  barcode: string;
  normalized_ingredients: string[];
  user_corrected_ingredients: string[];
  message_uz?: string;
  candidate_id?: string | null;
};

export async function fetchProductSubmissions(): Promise<ProductSubmission[]> {
  return apiJson("/api/v1/hair-advisor/submissions/");
}

export async function createProductSubmission(body: {
  hair_scan_id?: string;
  barcode?: string;
  front_image?: string;
  back_image?: string;
  ingredient_label_image?: string;
  barcode_image?: string;
  user_corrected_ingredients?: string[];
  observed_price?: number;
  currency?: string;
  store_name?: string;
  finalize?: boolean;
}): Promise<ProductSubmission> {
  return postJson("/api/v1/hair-advisor/submissions/", body);
}