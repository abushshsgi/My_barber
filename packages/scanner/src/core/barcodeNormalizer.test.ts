import { describe, expect, it } from "vitest";
import { expandUpcE, validateGtinChecksum } from "./barcodeValidator";
import { normalizeBarcode, normalizeRetailBarcode, validateRetailBarcodeChecksum } from "./barcodeNormalizer";
import { isDuplicateBarcodeSubmit } from "./scanDeduplicator";
import { canTransition } from "./scannerStateMachine";

describe("validateGtinChecksum", () => {
  it("accepts valid EAN-13", () => {
    expect(validateGtinChecksum("5901234123457")).toBe(true);
  });

  it("rejects invalid checksum", () => {
    expect(validateGtinChecksum("5901234123450")).toBe(false);
  });

  it("accepts valid UPC-A", () => {
    // 036000291452 — classic UPC-A example
    expect(validateGtinChecksum("036000291452")).toBe(true);
  });

  it("accepts valid EAN-8", () => {
    expect(validateGtinChecksum("96385074")).toBe(true);
  });

  it("preserves leading zeros as strings", () => {
    const n = normalizeBarcode("036000291452");
    expect(n.normalizedValue.startsWith("0")).toBe(true);
    expect(typeof n.normalizedValue).toBe("string");
  });
});

describe("UPC-E expansion", () => {
  it("expands a known UPC-E", () => {
    // 04252614 → number system 0, mid 425261, check 4
    // Common fixture: 02345673 expands (verify checksum after expand)
    const expanded = expandUpcE("02345673");
    expect(expanded).not.toBeNull();
    expect(expanded!.length).toBe(12);
    expect(validateGtinChecksum(expanded!)).toBe(true);
  });
});

describe("normalizeBarcode", () => {
  it("builds UPC-A / EAN-13 lookup candidates", () => {
    const n = normalizeBarcode("036000291452", "upc_a");
    expect(n.isValid).toBe(true);
    expect(n.lookupCandidates).toContain("036000291452");
    expect(n.lookupCandidates).toContain("0036000291452");
    expect(n.gtin14).toBe("00036000291452");
  });

  it("handles EAN-13 with leading zero as UPC variant", () => {
    const n = normalizeBarcode("0036000291452", "ean_13");
    expect(n.isValid).toBe(true);
    expect(n.lookupCandidates).toContain("036000291452");
  });

  it("marks malformed data invalid", () => {
    const n = normalizeBarcode("123");
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
});

describe("legacy helpers", () => {
  it("normalizeRetailBarcode strips non-digits", () => {
    expect(normalizeRetailBarcode("590 1234 12345 7")).toBe("5901234123457");
    expect(normalizeRetailBarcode("1234567")).toBeNull();
  });

  it("validateRetailBarcodeChecksum matches server rules", () => {
    expect(validateRetailBarcodeChecksum("5901234123457").valid).toBe(true);
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
