const STORAGE_KEY = "mysaloon.referralCode";
const CODE_RE = /^[A-Z2-9]{1,12}$/;

/** URL ?ref= yoki qo'lda kiritilgan kodni tozalash — faqat ruxsat etilgan belgilar. */
export function normalizeReferralCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 12);
  return cleaned;
}

export function stashReferralCode(raw: unknown): void {
  if (typeof window === "undefined") return;
  const code = normalizeReferralCode(raw);
  if (!code || !CODE_RE.test(code)) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, code);
  } catch {
    // sessionStorage yo'q (private mode) — jim o'tkazamiz.
  }
}

export function getStashedReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value && CODE_RE.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearStashedReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
