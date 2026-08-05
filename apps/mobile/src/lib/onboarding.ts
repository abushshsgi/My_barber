/** Web `needsOnboarding` bilan bir xil — faqat `onboarding_completed === true` bo'lsa o'tkaziladi. */
export function needsOnboarding(user?: { onboarding_completed?: boolean } | null): boolean {
  if (!user) return false;
  return user.onboarding_completed !== true;
}

/** GPS koordinat — backend DecimalField uchun. */
export function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export const ONBOARDING_STEPS = ["Ism", "Yosh", "Joylashuv"] as const;
