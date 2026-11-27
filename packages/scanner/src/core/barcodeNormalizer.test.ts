import { describe, expect, it } from "vitest";
import { expandUpcE, validateGtinChecksum, computeGtinCheckDigit } from "./barcodeValidator";
import { normalizeBarcode, normalizeRetailBarcode, validateRetailBarcodeChecksum } from "./barcodeNormalizer";
import { isDuplicateBarcodeSubmit } from "./scanDeduplicator";
import { canTransition } from "./scannerStateMachine";

/** Synthetic checksum-valid GTINs for tests only — NOT claimed product identities. */
const FIXTURES = {
  ean13: "5901234123457",
  ean8: "96385074",
  upcA: "036000291452",
  /** International prefix samples (identifier shape only). */
  prefixSamples: {
    uz_or_intl_478: "4781234567890", // may fail checksum — built below when needed
    de_400: "4006381333931",
    jp_jan: "4901234567894",
  },
} as const;

function makeValidGtin13(body12: string): string {
  return `${body12}${computeGtinCheckDigit(body12)}`;
}

describe("validateGtinChecksum", () => {
  it("accepts valid EAN-13", () => {
    expect(validateGtinChecksum(FIXTURES.ean13)).toBe(true);
  });

  it("rejects invalid checksum", () => {
    expect(validateGtinChecksum("5901234123450")).toBe(false);
  });

  it("accepts valid UPC-A", () => {
    expect(validateGtinChecksum(FIXTURES.upcA)).toBe(true);
  });

  it("accepts valid EAN-8", () => {
    expect(validateGtinChecksum(FIXTURES.ean8)).toBe(true);
  });

  it("accepts GTIN-14 with leading zeros", () => {
    expect(validateGtinChecksum("00036000291452")).toBe(true);
  });

  it("preserves leading zeros as strings", () => {
    const n = normalizeBarcode(FIXTURES.upcA);
    expect(n.normalizedValue.startsWith("0")).toBe(true);
    expect(typeof n.normalizedValue).toBe("string");
  });
});

describe("UPC-E expansion", () => {
  it("expands a known UPC-E", () => {
    const expanded = expandUpcE("02345673");
    expect(expanded).not.toBeNull();
    expect(expanded!.length).toBe(12);
    expect(validateGtinChecksum(expanded!)).toBe(true);
  });

  it("normalizeBarcode with upc_e hint returns retail_gtin", () => {
    const n = normalizeBarcode("02345673", "upc_e");
    expect(n.isValid).toBe(true);
    expect(n.format).toBe("upc_e");
    expect(n.normalizedValue.length).toBe(12);
    expect(n.lookupCandidates.length).toBeGreaterThan(0);
  });
});

describe("normalizeBarcode", () => {
  it("builds UPC-A / EAN-13 lookup candidates (equivalence)", () => {
    const n = normalizeBarcode(FIXTURES.upcA, "upc_a");
    expect(n.isValid).toBe(true);
    expect(n.lookupCandidates).toContain(FIXTURES.upcA);
    expect(n.lookupCandidates).toContain("0036000291452");
    expect(n.gtin14).toBe("00036000291452");
  });

  it("handles EAN-13 with leading zero as UPC variant", () => {
    const n = normalizeBarcode("0036000291452", "ean_13");
    expect(n.isValid).toBe(true);
    expect(n.lookupCandidates).toContain(FIXTURES.upcA);
  });

  it("normalizes EAN-8", () => {
    const n = normalizeBarcode(FIXTURES.ean8, "ean_8");
    expect(n.isValid).toBe(true);
    expect(n.format).toBe("ean_8");
    expect(n.gtin14).toBe("00000096385074");
  });

  it("pads GTIN-14 and strips leading zero for working form", () => {
    const n = normalizeBarcode("00036000291452", "gtin_14");
    expect(n.isValid).toBe(true);
    expect(n.lookupCandidates).toContain(FIXTURES.upcA);
  });

  it("marks malformed data invalid", () => {
    const n = normalizeBarcode("123");
    expect(n.isValid).toBe(false);
  });

  it("rejects checksum fail", () => {
    const n = normalizeBarcode("5901234123450");
    expect(n.isValid).toBe(false);
  });

  it("does not treat URLs as retail products without GTIN", () => {
    const n = normalizeBarcode("https://example.com/product");
    expect(n.identifierType).toBe("url");
    expect(n.isValid).toBe(false);
  });

  it("extracts GTIN from GS1 Digital Link without navigating", () => {
    const n = normalizeBarcode("https://id.gs1.org/01/0036000291452");
    expect(n.isValid).toBe(true);
    expect(n.normalizedValue).toContain("36000291452");
  });

  it("accepts international prefix samples only as identifier shapes when checksum-valid", () => {
    // Build valid EAN-13 bodies with regional-looking prefixes (not product claims).
    const de = makeValidGtin13("400638133393");
    const jp = makeValidGtin13("490123456789");
    expect(validateGtinChecksum(de)).toBe(true);
    expect(validateGtinChecksum(jp)).toBe(true);
    expect(normalizeBarcode(de).isValid).toBe(true);
    expect(normalizeBarcode(jp).isValid).toBe(true);
  });
});

describe("legacy helpers", () => {
  it("normalizeRetailBarcode strips non-digits", () => {
    expect(normalizeRetailBarcode("590 1234 12345 7")).toBe("5901234123457");
    expect(normalizeRetailBarcode("1234567")).toBeNull();
  });

  it("validateRetailBarcodeChecksum matches server rules", () => {
    expect(validateRetailBarcodeChecksum(FIXTURES.ean13).valid).toBe(true);
    expect(validateRetailBarcodeChecksum("5901234123450").valid).toBe(false);
  });
});

describe("dedup + FSM", () => {
  it("deduplicates within window", () => {
    expect(isDuplicateBarcodeSubmit("a", "a", 1000, 1500, 8000)).toBe(true);
    expect(isDuplicateBarcodeSubmit("a", "a", 1000, 10000, 8000)).toBe(false);
    expect(isDuplicateBarcodeSubmit("b", "a", 1000, 1500, 8000)).toBe(false);
  });

  it("blocks analyzing before product", () => {
    expect(canTransition("scanning", "analyzing_product")).toBe(false);
    expect(canTransition("product_found", "preparing_advisor")).toBe(true);
  });
});
