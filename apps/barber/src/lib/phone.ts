const UZ_LOCAL_SEGMENTS = [2, 3, 2, 2] as const;

export function parseUzLocalPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length >= 12) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
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
  return parseUzLocalPhone(digits).length === 9;
}

export function validateUzPhoneField(raw: string): string | null {
  const digits = parseUzLocalPhone(raw);
  if (!digits) return "Telefon raqami majburiy.";
  if (digits.length < 9) return "Telefon 9 ta raqamdan iborat bo'lishi kerak (+998 dan keyin).";
  return null;
}

/** Login: email yoki telefon */
export function looksLikeLoginEmail(value: string): boolean {
  return value.includes("@");
}
