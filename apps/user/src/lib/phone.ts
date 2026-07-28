const UZ_LOCAL_SEGMENTS = [2, 3, 2, 2] as const;

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
  return parts.join("-");
}

/** 9 xonali mahalliy raqam → +998XXXXXXXXX */
export function toUzE164Phone(localDigits: string): string {
  const d = parseUzLocalPhone(localDigits);
  if (d.length !== 9) return "";
  return `+998${d}`;
}

/** Saqlangan +998… yoki mahalliy raqamdan 9 xonali qism */
export function uzPhoneToLocalDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length >= 12) return digits.slice(3, 12);
  return digits.slice(-9);
}
