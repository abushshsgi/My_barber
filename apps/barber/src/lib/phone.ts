const UZ_LOCAL_SEGMENTS = [2, 3, 2, 2] as const;

/** +998 dan keyingi 2 xonali operator kodlari */
const UZ_MOBILE_PREFIXES = new Set([
  "20",
  "22",
  "33",
  "50",
  "77",
  "78",
  "88",
  "90",
  "91",
  "93",
  "94",
  "95",
  "97",
  "98",
  "99",
]);

export function parseUzLocalPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 9);
}

export function formatUzLocalPhone(digits: string): string {
  const d = parseUzLocalPhone(digits);
  const parts: string[] = [];
  let i = 0;
  for (const len of UZ_LOCAL_SEGMENTS) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + len));
    i += len;
  }
  return parts.join(" ");
}

/** Display: +998 XX XXX XX XX */
export function formatUzPhoneDisplay(raw: string): string {
  const digits = parseUzLocalPhone(raw);
  if (!digits) return "";
  return `+998 ${formatUzLocalPhone(digits)}`.trim();
}

/** Store draft/API: +998XXXXXXXXX */
export function formatUzPhoneE164(raw: string): string {
  const digits = parseUzLocalPhone(raw);
  if (!digits) return "";
  return `+998${digits}`;
}

export function isValidUzLocalPhone(digits: string): boolean {
  const d = parseUzLocalPhone(digits);
  if (d.length !== 9) return false;
  return UZ_MOBILE_PREFIXES.has(d.slice(0, 2));
}

export function validateUzPhoneField(raw: string): string | null {
  const digits = parseUzLocalPhone(raw);
  if (!digits) return "Telefon raqami majburiy.";
  if (digits.length < 9) return "Telefon 9 ta raqamdan iborat bo'lishi kerak.";
  if (!isValidUzLocalPhone(digits)) return "O'zbekiston mobil raqami kiriting.";
  return null;
}

/** Login: email yoki telefon */
export function looksLikeLoginEmail(value: string): boolean {
  return value.includes("@");
}
