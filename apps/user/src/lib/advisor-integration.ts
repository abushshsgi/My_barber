import {
  analyzeHairScan,
  createHairScan,
  type HairAnalysis,
  type HairScan,
} from "@/lib/api/hair-advisor";
import { resolveScanToAnalysis } from "@/components/hair-advisor-2/scan-flow";
import { normalizeBarcode } from "@mybarber/scanner";

export type AnalyzeScannedProductInput = {
  barcode?: string;
  imageDataUrl?: string;
  inputMethod?: "barcode" | "manual_barcode" | "camera_label" | "gallery";
  scanSessionId?: string;
  signal?: AbortSignal;
};

export type AnalyzeScannedProductResult =
  | { ok: true; scan: HairScan; analysis: HairAnalysis }
  | { ok: false; scan?: HairScan; needIngredients: true }
  | { ok: false; error: string; code?: string; scan?: HairScan };

/**
 * Pass resolved scan into the existing Hair Advisor pipeline.
 * Does not create a second Advisor system.
 */
export async function analyzeScannedProduct(
  input: AnalyzeScannedProductInput,
): Promise<AnalyzeScannedProductResult> {
  if (input.signal?.aborted) {
    return { ok: false, error: "SESSION_CANCELLED", code: "SESSION_CANCELLED" };
  }

  try {
    let scan: HairScan;
    if (input.barcode) {
      const normalized = normalizeBarcode(input.barcode);
      if (!normalized.isValid) {
        return { ok: false, error: "INVALID_BARCODE", code: "INVALID_BARCODE" };
      }
      scan = await createHairScan({
        input_method: input.inputMethod === "manual_barcode" ? "manual_barcode" : "barcode",
        barcode: normalized.normalizedValue,
        idempotency_key: input.scanSessionId || `ha-adv-${normalized.normalizedValue}`,
      });
    } else if (input.imageDataUrl) {
      scan = await createHairScan({
        input_method: input.inputMethod === "gallery" ? "gallery" : "camera_label",
        image: input.imageDataUrl,
        idempotency_key: input.scanSessionId,
      });
    } else {
      return { ok: false, error: "PRODUCT_DATA_INCOMPLETE", code: "PRODUCT_DATA_INCOMPLETE" };
    }

    if (input.signal?.aborted) {
      return { ok: false, error: "SESSION_CANCELLED", code: "SESSION_CANCELLED", scan };
    }

    if (scan.status === "failed") {
      return {
        ok: false,
        error: scan.error_message || "AI_ANALYSIS_FAILED",
        code: scan.error_code || "AI_ANALYSIS_FAILED",
        scan,
      };
    }
    if (scan.status === "product_not_found") {
      return { ok: false, error: "PRODUCT_NOT_FOUND", code: "PRODUCT_NOT_FOUND", scan };
    }

    const resolved = await resolveScanToAnalysis(scan);
    if ("needIngredients" in resolved) {
      return { ok: false, needIngredients: true, scan: resolved.scan };
    }
    return { ok: true, scan: resolved.scan, analysis: resolved.analysis };
  } catch (e) {
    const message = e instanceof Error ? e.message : "NETWORK_UNAVAILABLE";
    return { ok: false, error: message, code: "NETWORK_UNAVAILABLE" };
  }
}

/** Re-analyze an existing scan id through Advisor. */
export async function reanalyzeScan(scanId: string): Promise<HairAnalysis | null> {
  try {
    return await analyzeHairScan(scanId);
  } catch {
    return null;
  }
}
