import { mapDecoderFormat, RETAIL_GTIN_FORMATS } from "./barcodeFormats";
import {
  digitsOnly,
  expandUpcE,
  padGtin14,
  validateGtinChecksum,
} from "./barcodeValidator";
import type { BarcodeFormatId, IdentifierType, NormalizedBarcode } from "./scannerTypes";

const GS1_AI_GTIN = /^01(\d{14})/;

function looksLikeUrl(raw: string): boolean {
  return /^https?:\/\//i.test(raw.trim()) || /^www\./i.test(raw.trim());
}

function parseGs1DigitalLink(raw: string): { gtin?: string; rest?: string } | null {
  const trimmed = raw.trim();
  if (!looksLikeUrl(trimmed) && !trimmed.includes("id.gs1.org") && !/\/01\//.test(trimmed)) {
    return null;
  }
  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    const pathMatch = url.pathname.match(/\/01\/(\d{8,14})/);
    if (pathMatch) return { gtin: pathMatch[1] };
    const q = url.searchParams.get("01") || url.searchParams.get("gtin");
    if (q) return { gtin: digitsOnly(q) };
  } catch {
    /* not a URL */
  }
  const m = trimmed.match(/\/01\/(\d{8,14})/);
  if (m) return { gtin: m[1] };
  return null;
}

function parseGs1ElementString(raw: string): { gtin?: string } | null {
  const digits = digitsOnly(raw);
  const m = GS1_AI_GTIN.exec(digits);
  if (m) return { gtin: m[1] };
  // FNC1-stripped common form starting with 01
  if (digits.startsWith("01") && digits.length >= 16) {
    const gtin = digits.slice(2, 16);
    if (validateGtinChecksum(gtin)) return { gtin };
  }
  return null;
}

function inferFormat(digits: string, hinted?: BarcodeFormatId): BarcodeFormatId {
  if (hinted && hinted !== "unknown") return hinted;
  if (digits.length === 8) return "ean_8";
  if (digits.length === 12) return "upc_a";
  if (digits.length === 13) return "ean_13";
  if (digits.length === 14) return "gtin_14";
  return "unknown";
}

function classifyIdentifier(
  format: BarcodeFormatId,
  digits: string,
  raw: string,
  isValidGtin: boolean,
): IdentifierType {
  if (looksLikeUrl(raw) || parseGs1DigitalLink(raw)) {
    return isValidGtin ? "gs1_structured" : "url";
  }
  if (RETAIL_GTIN_FORMATS.includes(format) && isValidGtin) return "retail_gtin";
  if (format === "code_128" || format === "gs1_128" || format === "itf" || format === "itf_14") {
    return isValidGtin ? "retail_gtin" : "logistics";
  }
  if (format === "qr" && !isValidGtin) return looksLikeUrl(raw) ? "url" : "unknown";
  if (digits.length >= 8 && digits.length <= 14 && isValidGtin) return "retail_gtin";
  return "unknown";
}

function uniqueCandidates(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/**
 * Normalize a decoded barcode for product lookup.
 * Preserves rawValue; never uses Number().
 */
export function normalizeBarcode(
  rawValue: string,
  formatHint?: string | BarcodeFormatId | null,
): NormalizedBarcode {
  const raw = String(rawValue ?? "");
  const hinted = mapDecoderFormat(formatHint ?? undefined);

  // GS1 Digital Link — extract GTIN, never navigate
  const digital = parseGs1DigitalLink(raw);
  if (digital?.gtin) {
    return normalizeBarcode(digital.gtin, hinted === "unknown" ? "ean_13" : hinted);
  }

  const gs1 = parseGs1ElementString(raw);
  if (gs1?.gtin && raw !== gs1.gtin) {
    const inner = normalizeBarcode(gs1.gtin, "gtin_14");
    return {
      ...inner,
      rawValue: raw,
      identifierType: "gs1_structured",
      format: hinted === "code_128" || hinted === "gs1_128" ? hinted : inner.format,
    };
  }

  // UPC-E expansion
  if (hinted === "upc_e" || (digitsOnly(raw).length <= 8 && hinted === "unknown")) {
    const expanded = expandUpcE(raw);
    if (expanded && validateGtinChecksum(expanded)) {
      const gtin14 = padGtin14(expanded);
      const ean13 = expanded.startsWith("0") ? `0${expanded}` : expanded;
      return {
        rawValue: raw,
        format: "upc_e",
        normalizedValue: expanded,
        gtin14,
        isValid: true,
        identifierType: "retail_gtin",
        lookupCandidates: uniqueCandidates([
          expanded,
          ean13.length === 13 ? ean13 : `0${expanded}`,
          expanded.replace(/^0/, ""),
          gtin14 ?? "",
          digitsOnly(raw),
        ]),
      };
    }
  }

  const digits = digitsOnly(raw);
  if (!digits) {
    return {
      rawValue: raw,
      format: hinted,
      normalizedValue: "",
      isValid: false,
      identifierType: looksLikeUrl(raw) ? "url" : "unknown",
      lookupCandidates: [],
    };
  }

  let working = digits;
  let format = inferFormat(working, hinted);

  // UPC-A ↔ EAN-13 equivalence candidates
  if (working.length === 12 && validateGtinChecksum(working)) {
    format = hinted === "upc_e" ? "upc_e" : "upc_a";
  } else if (working.length === 13 && validateGtinChecksum(working)) {
    format = "ean_13";
  } else if (working.length === 8 && validateGtinChecksum(working)) {
    format = "ean_8";
  } else if (working.length === 14 && validateGtinChecksum(working)) {
    format = "gtin_14";
    // Prefer GTIN-13 form for many providers when leading zero
    if (working.startsWith("0")) working = working.slice(1);
  }

  const validDigits = validateGtinChecksum(digits)
    ? digits
    : validateGtinChecksum(working)
      ? working
      : digits;

  const reallyValid = validateGtinChecksum(validDigits);
  const gtin14 = reallyValid ? padGtin14(validDigits) : undefined;
  const identifierType = classifyIdentifier(format, validDigits, raw, reallyValid);

  const candidates: string[] = [validDigits];
  if (validDigits.length === 12) candidates.push(`0${validDigits}`);
  if (validDigits.length === 13 && validDigits.startsWith("0")) {
    candidates.push(validDigits.slice(1));
  }
  // GTIN-14 → also offer stripped EAN-13 / UPC-A forms for provider lookup
  if (working !== validDigits && validateGtinChecksum(working)) {
    candidates.push(working);
    if (working.length === 13 && working.startsWith("0")) {
      candidates.push(working.slice(1));
    }
    if (working.length === 12) {
      candidates.push(`0${working}`);
    }
  }
  if (gtin14) candidates.push(gtin14);
  if (digits !== validDigits) candidates.push(digits);

  return {
    rawValue: raw,
    format,
    normalizedValue: reallyValid ? validDigits : digits,
    gtin14,
    isValid: reallyValid && identifierType !== "url",
    identifierType,
    lookupCandidates: uniqueCandidates(candidates),
  };
}

/** Convenience: retail checksum validation (legacy API shape). */
export function validateRetailBarcodeChecksum(code: string): {
  valid: boolean;
  normalized: string;
} {
  const n = normalizeBarcode(code);
  return { valid: n.isValid && n.identifierType === "retail_gtin", normalized: n.normalizedValue };
}

export function normalizeRetailBarcode(raw: string): string | null {
  const digits = digitsOnly(raw);
  if (digits.length < 8) return null;
  if (digits.length > 14) return digits.slice(0, 14);
  return digits;
}
