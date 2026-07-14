const MIN_PART_LEN = 2;
const MAX_PARTS = 4;
const MAX_LEN = 255;

const ALLOWED_INPUT = /[\p{L}\s\-'\u02bb\u2019\u2010\u2011\u2013\u2014\u2018]/u;

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
  return raw
    .normalize("NFKC")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212\ufe58\ufe63\uff0d]/g, "-")
    .replace(/[\u02bc\u02b9\u02bb\u2018\u2019\u201b\u2032\uff07]/g, "'")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .trim()
    .replace(/\s+/g, " ");
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
