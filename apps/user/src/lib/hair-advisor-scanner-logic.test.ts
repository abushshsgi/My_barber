import { describe, expect, it } from "vitest";
import {
  canShowActiveScanAnimation,
  isDuplicateBarcodeSubmit,
  nextPhaseAfterScan,
  resolveScannerUiPhase,
  shouldOpenProductPick,
  statusForPhase,
  statusI18nKey,
} from "./hair-advisor-scanner-logic";
import type { HairScan } from "@/lib/api/hair-advisor";
import { validateRetailBarcodeChecksum } from "./hair-advisor-barcode-decode";

describe("validateRetailBarcodeChecksum", () => {
  it("accepts valid EAN-13", () => {
    expect(validateRetailBarcodeChecksum("5901234123457").valid).toBe(true);
  });
  it("rejects bad check digit", () => {
    expect(validateRetailBarcodeChecksum("5901234123450").valid).toBe(false);
  });
});

describe("shouldOpenProductPick", () => {
  it("requires ambiguous meta with catalog candidates", () => {
    const one = {
      recognition_meta: { recognition_status: "ambiguous", candidate_ids: [1] },
      product_candidates: [{ id: 1 }],
    } as unknown as HairScan;
    expect(shouldOpenProductPick(one)).toBe(true);
  });
  it("requires ambiguous meta and multiple candidates", () => {
    const scan = {
      recognition_meta: { recognition_status: "ambiguous", candidate_ids: [1, 2] },
      product_candidates: [{ id: 1 }, { id: 2 }],
    } as unknown as HairScan;
    expect(shouldOpenProductPick(scan)).toBe(true);
  });
  it("opens pick for probable_match", () => {
    const scan = {
      recognition_meta: { recognition_status: "probable_match", candidate_ids: [1] },
      product_candidates: [{ id: 1 }],
    } as unknown as HairScan;
    expect(shouldOpenProductPick(scan)).toBe(true);
  });
  it("skips single exact match flow", () => {
    const scan = {
      recognition_meta: { recognition_status: "exact" },
      product_candidates: [],
    } as unknown as HairScan;
    expect(shouldOpenProductPick(scan)).toBe(false);
  });
});

describe("isDuplicateBarcodeSubmit", () => {
  it("blocks repeat within window", () => {
    const now = 10_000;
    expect(isDuplicateBarcodeSubmit("5901234123457", "5901234123457", 9_500, now)).toBe(true);
    expect(isDuplicateBarcodeSubmit("5901234123457", "5901234123457", 1_000, now)).toBe(false);
  });
});

describe("nextPhaseAfterScan", () => {
  it("routes statuses predictably", () => {
    expect(nextPhaseAfterScan({ status: "product_not_found" } as HairScan)).toBe("not_found");
    expect(nextPhaseAfterScan({ status: "failed" } as HairScan)).toBe("error");
    expect(
      nextPhaseAfterScan({
        status: "needs_confirmation",
        recognition_meta: { recognition_status: "ambiguous", candidate_ids: [1, 2] },
        product_candidates: [{ id: 1 }, { id: 2 }],
      } as unknown as HairScan),
    ).toBe("pick");
    expect(
      nextPhaseAfterScan({
        status: "product_found",
        recognition_meta: { recognition_status: "exact" },
      } as unknown as HairScan),
    ).toBe("resolve");
  });
});

describe("statusForPhase", () => {
  it("shows success copy on barcode_detected", () => {
    expect(statusForPhase("barcode_detected", "barcode")).toContain("Shtrix-kod");
  });
  it("clears helper text on error", () => {
    expect(statusForPhase("error", "barcode")).toBe("");
  });
});

describe("scanner camera gate", () => {
  it("maps permission denied over active scanning copy", () => {
    expect(resolveScannerUiPhase("scanning", "permission_denied")).toBe("permission_denied");
    expect(statusI18nKey("permission_denied", "barcode")).toBe("scanner.status.permissionDenied");
  });

  it("does not show active scan animation when camera is denied", () => {
    expect(
      canShowActiveScanAnimation({
        cameraGate: "permission_denied",
        cameraStreamReady: false,
        mode: "barcode",
        workflowPhase: "scanning",
        decodeEnabled: true,
        sessionLocked: false,
      }),
    ).toBe(false);
  });
});