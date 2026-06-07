const COOLDOWN_PREFIX = "mysaloon.auth.otpCooldown:";

export function getStoredOtpCooldownSeconds(phone: string): number {
  if (typeof window === "undefined" || phone.length !== 9) return 0;
  try {
    const raw = sessionStorage.getItem(`${COOLDOWN_PREFIX}${phone}`);
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

export function storeOtpCooldown(phone: string, seconds: number) {
  if (typeof window === "undefined" || phone.length !== 9 || seconds <= 0) return;
  try {
    sessionStorage.setItem(`${COOLDOWN_PREFIX}${phone}`, String(Date.now() + seconds * 1000));
  } catch {
    /* noop */
  }
}

export function clearOtpCooldown(phone: string) {
  if (typeof window === "undefined" || phone.length !== 9) return;
  try {
    sessionStorage.removeItem(`${COOLDOWN_PREFIX}${phone}`);
  } catch {
    /* noop */
  }
}
