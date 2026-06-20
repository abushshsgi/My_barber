const MIN_PART_LEN = 2;
const MAX_PARTS = 4;
const MAX_LEN = 255;

const ALLOWED_INPUT = /[\p{L}\s\-'\u02bb\u2019]/u;

export type DisplayNameErrorKey =
  | "nameRequired"
  | "nameInvalidChars"
  | "nameNeedsFull"
  | "namePartTooShort"
  | "nameTooLong"
  | "nameTooManyParts";

export type DisplayNameValidation =
  | { ok: true; value: string }
  | { ok: false; errorKey: DisplayNameErrorKey };

export function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Klaviaturadan faqat ruxsat etilgan belgilarni qoldiradi. */
export function sanitizeDisplayNameInput(raw: string): string {
  return [...raw].filter((ch) => ALLOWED_INPUT.test(ch)).join("");
}

export function validateDisplayName(raw: string, currentName?: string): DisplayNameValidation {
  const value = normalizeDisplayName(raw);
  if (!value) {
    return { ok: false, errorKey: "nameRequired" };
  }

  if (currentName && value.localeCompare(normalizeDisplayName(currentName), undefined, { sensitivity: "accent" }) === 0) {
    return { ok: true, value };
  }

  if (value.length > MAX_LEN) {
    return { ok: false, errorKey: "nameTooLong" };
  }

  if ([...value].some((ch) => !ALLOWED_INPUT.test(ch))) {
    return { ok: false, errorKey: "nameInvalidChars" };
  }

  const parts = value.split(" ");
  if (parts.length < 2) {
    return { ok: false, errorKey: "nameNeedsFull" };
  }
  if (parts.length > MAX_PARTS) {
    return { ok: false, errorKey: "nameTooManyParts" };
  }

  for (const part of parts) {
    const letters = part.replace(/[-'\u02bb\u2019]/g, "");
    if (letters.length < MIN_PART_LEN) {
      return { ok: false, errorKey: "namePartTooShort" };
    }
  }

  return { ok: true, value };
}
