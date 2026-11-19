import { describe, expect, it } from "vitest";
import { normalizeRetailBarcode } from "./hair-advisor-barcode-decode";

describe("normalizeRetailBarcode", () => {
  it("strips non-digits and enforces minimum length", () => {
    expect(normalizeRetailBarcode("5901234123457")).toBe("5901234123457");
    expect(normalizeRetailBarcode("590 1234 12345 7")).toBe("5901234123457");
    expect(normalizeRetailBarcode("1234567")).toBeNull();
  });
});