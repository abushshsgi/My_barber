import { describe, expect, it } from "vitest";
import {
  decideGalleryNextAction,
  exifOrientationDegrees,
  galleryDecodeSummary,
  selectGalleryBarcode,
  stillImageNativeTypes,
} from "./galleryPlan";
import {
  formatScannerDiagnostics,
  redactBarcode,
  redactDiagnosticText,
  scannerDiagnosticsEnabled,
} from "./scannerDiagnostics";

const EAN_13 = "5901234123457";

describe("still-image platform support", () => {
  it("limits iOS native still-image decode to QR", () => {
    expect(stillImageNativeTypes("ios")).toEqual(["qr"]);
    expect(galleryDecodeSummary("ios")).toContain("QR only");
  });

  it("offers Android ML Kit retail types without claiming every symbology", () => {
    const types = stillImageNativeTypes("android");
    expect(types).toContain("ean13");
    expect(types).toContain("upc_a");
    expect(types).not.toContain("pdf417");
    expect(types).not.toContain("aztec");
  });
});

describe("exif orientation", () => {
  it("maps the common rotated tags and leaves upright photos at 0", () => {
    expect(exifOrientationDegrees(1)).toBe(0);
    expect(exifOrientationDegrees(3)).toBe(180);
    expect(exifOrientationDegrees(6)).toBe(90);
    expect(exifOrientationDegrees(8)).toBe(270);
    expect(exifOrientationDegrees(undefined)).toBe(0);
  });
});

describe("selectGalleryBarcode", () => {
  it("prefers a valid EAN-13 over a URL QR", () => {
    const picked = selectGalleryBarcode([
      { data: "https://example.com/promo", type: "qr" },
      { data: EAN_13, type: "ean13" },
    ]);
    expect(picked.ok).toBe(true);
    if (picked.ok) {
      expect(picked.normalized).toBe(EAN_13);
      expect(picked.format).toBe("ean_13");
    }
  });

  it("treats an unreadable or non-retail image as not found", () => {
    expect(selectGalleryBarcode([]).ok).toBe(false);
    expect(selectGalleryBarcode([{ data: "5901234123450", type: "ean13" }]).ok).toBe(false);
    expect(selectGalleryBarcode([{ data: "https://shop.example/p", type: "qr" }]).ok).toBe(false);
  });

  it("accepts checksum-valid international prefixes", () => {
    const de = selectGalleryBarcode([{ data: "4006381333931", type: "ean13" }]);
    const jp = selectGalleryBarcode([{ data: "4901234567894", type: "ean13" }]);
    expect(de.ok).toBe(true);
    expect(jp.ok).toBe(true);
  });
});

describe("decideGalleryNextAction", () => {
  it("sends a local retail hit into the barcode engine", () => {
    const action = decideGalleryNextAction({
      mode: "barcode",
      local: { ok: true, raw: EAN_13, normalized: EAN_13, format: "ean_13" },
      online: true,
      hasAuth: true,
    });
    expect(action).toEqual({ action: "lookup_barcode", normalized: EAN_13, format: "ean_13" });
  });

  it("uses the server image path only when local decode misses and the user is signed in", () => {
    const action = decideGalleryNextAction({
      mode: "barcode",
      local: { ok: false, reason: "not_found" },
      online: true,
      hasAuth: true,
    });
    expect(action.action).toBe("server_image");
  });

  it("does not upload an image while offline or signed out", () => {
    expect(
      decideGalleryNextAction({
        mode: "barcode",
        local: { ok: false, reason: "not_found" },
        online: false,
        hasAuth: true,
      }).action,
    ).toBe("offline");
    expect(
      decideGalleryNextAction({
        mode: "product_image",
        local: { ok: false, reason: "not_found" },
        online: true,
        hasAuth: false,
      }).action,
    ).toBe("needs_auth");
  });
});

describe("scanner diagnostics", () => {
  it("stays off in production unless the explicit flag is set", () => {
    expect(scannerDiagnosticsEnabled(false, undefined)).toBe(false);
    expect(scannerDiagnosticsEnabled(false, "")).toBe(false);
    expect(scannerDiagnosticsEnabled(false, "1")).toBe(true);
    expect(scannerDiagnosticsEnabled(true, undefined)).toBe(true);
  });

  it("redacts tokens and shortens barcodes in the copyable report", () => {
    expect(redactDiagnosticText("Authorization: Bearer abc.def.ghi failed")).toContain("[redacted]");
    expect(redactDiagnosticText("token=super-secret")).not.toContain("super-secret");
    expect(redactBarcode(EAN_13)).toBe("590***57 (13)");
    const text = formatScannerDiagnostics({
      platform: "android",
      cameraPermission: "granted",
      cameraReady: true,
      decoderReady: true,
      supportedFormats: "ean13,ean8,upc_a,upc_e",
      galleryDecode: "ml kit",
      lastDetectedFormat: "ean_13",
      lastBarcodeRedacted: redactBarcode(EAN_13),
      validation: "valid",
      scanLock: false,
      productLookup: "found",
      providerStatus: "verified_catalog",
      advisorStatus: "ok",
      latencyMs: 120,
      decodePath: "zxing",
      error: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature",
    });
    expect(text).toContain("platform: android");
    expect(text).toContain("lastBarcode: 590***57 (13)");
    expect(text).not.toContain(EAN_13);
    expect(text).not.toContain("eyJhbGci");
    expect(text).toContain("[redacted]");
  });
});
