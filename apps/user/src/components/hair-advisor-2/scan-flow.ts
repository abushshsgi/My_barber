import {
  analyzeHairScan,
  confirmHairScanIngredients,
  type HairAnalysis,
  type HairScan,
} from "@/lib/api/hair-advisor";

export type ScanPhase = "IDLE" | "DETECTING" | "VALIDATING" | "LOOKUP" | "RESULT" | "ERROR";

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
    if (analysis) {
      return { scan, analysis };
    }
  }
  return { scan, needIngredients: true };
}

export type CompatibilityState =
  | "potentially_suitable"
  | "mixed"
  | "potentially_unsuitable"
  | "insufficient_information";

/** Map Advisor recommendation codes to qualitative states (no fake %). */
export function compatibilityState(recommendation: string | undefined): CompatibilityState {
  if (recommendation === "POTENTIAL_MATCH") return "potentially_suitable";
  if (recommendation === "CAUTION") return "mixed";
  if (recommendation === "AVOID" || recommendation === "NOT_RECOMMENDED") return "potentially_unsuitable";
  return "insufficient_information";
}

export function compatibilityLabel(recommendation: string | undefined): string {
  const state = compatibilityState(recommendation);
  if (state === "potentially_suitable") return "Mos kelishi mumkin";
  if (state === "mixed") return "Qisman mos";
  if (state === "potentially_unsuitable") return "Mos kelmasligi mumkin";
  return "Ma’lumot yetarli emas";
}

export function countryLabel(country?: string | null): string {
  const c = (country ?? "").trim();
  return c || "Noma'lum";
}