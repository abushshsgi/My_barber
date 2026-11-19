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

export function compatibilityLabel(recommendation: string | undefined): string {
  if (recommendation === "POTENTIAL_MATCH") return "Mos";
  if (recommendation === "CAUTION") return "Ehtiyotkorlik bilan";
  return "Mosligi aniqlanmagan";
}

export function countryLabel(country?: string | null): string {
  const c = (country ?? "").trim();
  return c || "Noma'lum";
}