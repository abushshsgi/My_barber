export function userHasProfileCoords(
  user?: {
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null,
): boolean {
  if (!user) return false;
  const lat = user.latitude;
  const lng = user.longitude;
  return (
    lat != null &&
    lat !== "" &&
    lng != null &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  );
}

export function isProfileLocationRequired(
  user?: { require_profile_location?: boolean } | null,
): boolean {
  return user?.require_profile_location === true;
}

/** Web `needsOnboarding` bilan bir xil — flag yoki profil to'liq emas bo'lsa true. */
export function needsOnboarding(
  user?: {
    onboarding_completed?: boolean;
    birth_year?: number | null;
    latitude?: string | number | null;
    longitude?: string | number | null;
    require_profile_location?: boolean;
  } | null,
): boolean {
  if (!user) return false;

  const hasBirth = user.birth_year != null && Number(user.birth_year) > 1900;
  if (user.onboarding_completed !== true) return true;
  if (!hasBirth) return true;
  return isProfileLocationRequired(user) && !userHasProfileCoords(user);
}

/** GPS koordinat — backend DecimalField uchun. */
export function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export const ONBOARDING_STEPS = ["Profil"] as const;
