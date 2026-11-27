/** GS1 / GTIN check digit — never coerce barcode to number. */

export function digitsOnly(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/** Compute GS1 check digit for body (without check). */
export function computeGtinCheckDigit(body: string): number {
  let total = 0;
  const reversed = body.split("").reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    const weight = i % 2 === 0 ? 3 : 1;
    total += Number(reversed[i]) * weight;
  }
  return (10 - (total % 10)) % 10;
}

export function validateGtinChecksum(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  const len = digits.length;
  if (len !== 8 && len !== 12 && len !== 13 && len !== 14) return false;
  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  return computeGtinCheckDigit(body) === check;
}

/**
 * Expand UPC-E (6–8 digit compact) to UPC-A (12).
 * Accepts with or without number system / check digit.
 */
export function expandUpcE(raw: string): string | null {
  let d = digitsOnly(raw);
  if (d.length === 8 && (d[0] === "0" || d[0] === "1")) {
    // numberSystem + 6-digit + check
    const ns = d[0];
    const mid = d.slice(1, 7);
    const check = d[7];
    const upcA = expandUpcE6(mid, ns);
    if (!upcA) return null;
    if (computeGtinCheckDigit(upcA.slice(0, 11)) !== Number(check)) return null;
    return upcA;
  }
  if (d.length === 7 && (d[0] === "0" || d[0] === "1")) {
    const ns = d[0];
    const mid = d.slice(1, 7);
    return expandUpcE6(mid, ns);
  }
  if (d.length === 6) {
    return expandUpcE6(d, "0");
  }
  return null;
}

function expandUpcE6(mid: string, numberSystem: string): string | null {
  if (!/^\d{6}$/.test(mid) || !/^[01]$/.test(numberSystem)) return null;
  const d1 = mid[0];
  const d2 = mid[1];
  const d3 = mid[2];
  const d4 = mid[3];
  const d5 = mid[4];
  const d6 = mid[5];
  let manufacturer: string;
  let product: string;
  switch (d6) {
    case "0":
    case "1":
    case "2":
      manufacturer = `${d1}${d2}${d6}00`;
      product = `00${d3}${d4}${d5}`;
      break;
    case "3":
      manufacturer = `${d1}${d2}${d3}00`;
      product = `000${d4}${d5}`;
      break;
    case "4":
      manufacturer = `${d1}${d2}${d3}${d4}0`;
      product = `0000${d5}`;
      break;
    default:
      manufacturer = `${d1}${d2}${d3}${d4}${d5}`;
      product = `0000${d6}`;
      break;
  }
  const body11 = `${numberSystem}${manufacturer}${product}`;
  if (body11.length !== 11) return null;
  const check = computeGtinCheckDigit(body11);
  return `${body11}${check}`;
}

export function padGtin14(digits: string): string | undefined {
  const d = digitsOnly(digits);
  if (!d || d.length > 14) return undefined;
  if (![8, 12, 13, 14].includes(d.length)) return undefined;
  if (!validateGtinChecksum(d)) return undefined;
  return d.padStart(14, "0");
}
