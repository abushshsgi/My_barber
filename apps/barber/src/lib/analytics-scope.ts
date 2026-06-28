/** Barber panel statistikasi — barcha bronlar (salon + mustaqil), daromad API bilan bir xil. */
export function resolveBarberAnalyticsParams(_scope?: {
  barberWorkMode?: "salon" | "independent";
  activeSalonId?: number | null;
}): { barberMe: true } {
  return { barberMe: true };
}
