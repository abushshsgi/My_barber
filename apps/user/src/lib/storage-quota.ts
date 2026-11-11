/** Brauzer localStorage/sessionStorage limiti (QuotaExceededError). */

export function isStorageQuotaError(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "object") {
    const e = error as { name?: string; code?: number; message?: string };
    if (e.name === "QuotaExceededError") return true;
    if (e.code === 22 || e.code === 1014) return true;
  }
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("quota") &&
    (msg.includes("exceed") || msg.includes("storage") || msg.includes("setitem"))
  );
}

export const STORAGE_QUOTA_USER_MESSAGE =
  "Telefonda xotira to‘ldi. Eski try-onlar tozalandi — qayta urinib ko‘ring.";

/** localStorage ga katta data: URL yozilmasin — ~5MB limit tez to‘ladi. */
export function stripDataUrlForStorage(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("data:")) return undefined;
  if (value.length > 512) return undefined;
  return value;
}

/** localStorage limiti brauzerda oshirilmaydi — xavfsiz yozish va bosilganini qisqartirish. */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (!isStorageQuotaError(error)) return false;
    try {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const k = localStorage.key(i);
        if (!k || k === key) continue;
        if (
          k.startsWith("mysaloon.morphAi.") ||
          k.startsWith("mysaloon.ai.faceHistory") ||
          k.startsWith("mysaloon.ai.savedStyles") ||
          k.includes(".chat.threads")
        ) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}
