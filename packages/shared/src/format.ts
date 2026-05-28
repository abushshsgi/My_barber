/** Minimal xizmat narxi (so'm) — barber panel va API. */
export const MIN_SERVICE_PRICE_UZS = 10_000;

export function formatSom(n: number): string {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

/** Matndan faqat raqamlarni ajratib, butun son qaytaradi. */
export function parseSomDigits(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}

/** Yozish paytida guruhlangan ko'rinish (masalan `60 000`). */
export function formatSomDigits(digits: string): string {
  const n = parseSomDigits(digits);
  if (n === 0) return "";
  return new Intl.NumberFormat("uz-UZ").format(n);
}

/** Input placeholder / yordamchi matn. */
export function formatSomInputDisplay(n: number): string {
  if (!n) return "";
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n));
}

/** Frontend validatsiya — xato matni yoki null (OK). */
export function validateServicePrice(price: number): string | null {
  if (!price) return "Xizmat narxini kiriting.";
  if (price < MIN_SERVICE_PRICE_UZS) {
    return `Minimal narx ${formatSom(MIN_SERVICE_PRICE_UZS)}.`;
  }
  return null;
}

export function formatKm(n?: number): string {
  if (n == null || Number.isNaN(n)) return "";
  return n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
