/** UZS ni qisqa ko‘rinishda (35k, 1.2M). */
export function shortPrice(amountUzs: number): string {
  if (!Number.isFinite(amountUzs) || amountUzs <= 0) return "";
  if (amountUzs >= 1_000_000) return `${(amountUzs / 1_000_000).toFixed(1)}M`;
  if (amountUzs >= 1_000) return `${Math.round(amountUzs / 1_000)}k`;
  return String(Math.round(amountUzs));
}
