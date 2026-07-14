const STORAGE_KEY = "mysaloon.referralCode";
/** Backend bilan bir xil alifbo (O/0/I/1/L chalkashmasin). */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{1,8}$`);

/** URL ?ref= yoki qo'lda kiritilgan kodni tozalash — faqat ruxsat etilgan belgilar. */
export function normalizeReferralCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const upper = raw.trim().toUpperCase();
  return [...upper].filter((ch) => CODE_ALPHABET.includes(ch)).join("").slice(0, 8);
}

export function buildInviteUrl(code: string, baseOrigin?: string): string {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return "";
  const origin = (baseOrigin || "https://mysaloon.uz").replace(/\/$/, "");
  return `${origin}/auth?ref=${normalized}`;
}

/** API localhost qaytarsa ham ulashish uchun ochiq domen ishlatiladi. */
export function resolveShareInviteUrl(code: string, apiInviteUrl?: string): string {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return "";
  if (apiInviteUrl) {
    try {
      const parsed = new URL(apiInviteUrl);
      const host = parsed.hostname.toLowerCase();
      if (host !== "localhost" && host !== "127.0.0.1" && host !== "0.0.0.0") {
        return `${parsed.origin}/auth?ref=${normalized}`;
      }
    } catch {
      // ignore malformed API URL
    }
  }
  return buildInviteUrl(normalized, "https://mysaloon.uz");
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
