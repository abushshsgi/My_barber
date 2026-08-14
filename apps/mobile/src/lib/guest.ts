import AsyncStorage from "@react-native-async-storage/async-storage";

const LANG_KEY = "mysaloon.lang";
/** v2 — 3 sahifali karusel (gallery / Morf AI / joylashuv). */
const WELCOME_SEEN_KEY = "mysaloon.welcome.seen.v2";
const LOCATION_KEY = "mysaloon.guest.location";

export type AppLang = "uz" | "ru";

export type GuestLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  region?: string;
};

export async function getAppLang(): Promise<AppLang | null> {
  const v = await AsyncStorage.getItem(LANG_KEY);
  return v === "uz" || v === "ru" ? v : null;
}

/** Birinchi ochilishda default til — rus. */
export async function getAppLangOrDefault(): Promise<AppLang> {
  return (await getAppLang()) ?? "ru";
}

export async function setAppLang(lang: AppLang): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export async function getWelcomeSeen(): Promise<boolean> {
  const v = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
  return v === "1";
}

export async function setWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
}

export async function getGuestLocation(): Promise<GuestLocation | null> {
  const raw = await AsyncStorage.getItem(LOCATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuestLocation;
    if (
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.longitude)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function setGuestLocation(loc: GuestLocation): Promise<void> {
  await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}
