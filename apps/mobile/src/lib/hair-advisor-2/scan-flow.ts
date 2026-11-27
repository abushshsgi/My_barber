import { analyzeHairScan, confirmHairScanIngredients, type HairAnalysis, type HairScan } from "../../api/hair-advisor";

const PICK_STATUSES = new Set(["ambiguous", "probable_match"]);

/** Ambiguous OCR / probable catalog matches → product pick (web parity). */
export function shouldOpenProductPick(scan: HairScan): boolean {
  const meta = scan.recognition_meta ?? {};
  const status = meta.recognition_status;
  if (!status || !PICK_STATUSES.has(status)) return false;
  const listed = scan.product_candidates?.length ?? 0;
  const ids = meta.candidate_ids?.length ?? 0;
  return listed >= 1 || ids >= 1;
}

export async function resolveScanToAnalysis(
  scan: HairScan,
): Promise<{ scan: HairScan; analysis: HairAnalysis } | { scan: HairScan; needIngredients: true }> {
  const list = (scan.ingredients_draft ?? []).map((i) => i.trim()).filter(Boolean);
  if (list.length > 0) {
    const out = await confirmHairScanIngredients(scan.id, list);
    return { scan: out.scan, analysis: out.analysis };
  }
  if (scan.status === "completed" || scan.analysis_id) {
    const analysis = await analyzeHairScan(scan.id).catch(() => null);
    if (analysis) return { scan, analysis };
  }
  return { scan, needIngredients: true };
}

export function compatibilityLabel(recommendation: string | undefined): string {
  if (recommendation === "POTENTIAL_MATCH") return "Mos kelishi mumkin";
  if (recommendation === "CAUTION") return "Qisman mos";
  if (recommendation === "AVOID" || recommendation === "NOT_RECOMMENDED") return "Mos kelmasligi mumkin";
  return "Ma’lumot yetarli emas";
}

export function compatibilityState(
  recommendation: string | undefined,
): "potentially_suitable" | "mixed" | "potentially_unsuitable" | "insufficient_information" {
  if (recommendation === "POTENTIAL_MATCH") return "potentially_suitable";
  if (recommendation === "CAUTION") return "mixed";
  if (recommendation === "AVOID" || recommendation === "NOT_RECOMMENDED") return "potentially_unsuitable";
  return "insufficient_information";
}