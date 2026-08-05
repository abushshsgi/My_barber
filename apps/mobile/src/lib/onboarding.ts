/** Web `needsOnboarding` bilan bir xil — flag yoki profil to'liq emas bo'lsa true. */
export function needsOnboarding(
  user?: {
    onboarding_completed?: boolean;
    birth_year?: number | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null,
): boolean {
  if (!user) return false;

  const hasBirth = user.birth_year != null && Number(user.birth_year) > 1900;
  const lat = user.latitude;
  const lng = user.longitude;
  const hasLoc =
    lat != null &&
    lat !== "" &&
    lng != null &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));

  if (user.onboarding_completed !== true) return true;
  // Flag true bo'lsa ham yosh/GPS yo'q bo'lsa — qayta so'rash
  return !hasBirth || !hasLoc;
}

/** GPS koordinat — backend DecimalField uchun. */
export function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export const ONBOARDING_STEPS = ["Ism", "Yosh"] as const;
