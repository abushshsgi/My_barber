import AsyncStorage from "@react-native-async-storage/async-storage";

const LANG_KEY = "mysaloon.lang";
/** v3 — feature carousel + gender + terms. */
const WELCOME_SEEN_KEY = "mysaloon.welcome.seen.v3";
const LOCATION_KEY = "mysaloon.guest.location";
const GENDER_KEY = "mysaloon.gender";
const FEATURES_SEEN_KEY = "mysaloon.intro.featuresSeen";
const TERMS_KEY = "mysaloon.intro.termsAccepted";
const SCAN_PROMO_KEY = "mysaloon.intro.scanPromoSeen";
const NOTIF_PROMO_KEY = "mysaloon.intro.notifPromoSeen";

export type AppLang = "uz" | "ru" | "en";
export type AppGender = "male" | "female";

export type GuestLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  region?: string;
};

export async function getAppLang(): Promise<AppLang | null> {
  const v = await AsyncStorage.getItem(LANG_KEY);
  if (v === "uz" || v === "ru" || v === "en") return v;
  return null;
}

export async function getAppLangOrDefault(): Promise<AppLang> {
  return (await getAppLang()) ?? "ru";
}

export async function setAppLang(lang: AppLang): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export async function getAppGender(): Promise<AppGender | null> {
  const v = await AsyncStorage.getItem(GENDER_KEY);
  if (v === "male" || v === "female") return v;
  return null;
}

export async function setAppGender(gender: AppGender): Promise<void> {
  await AsyncStorage.setItem(GENDER_KEY, gender);
}

export function genderToAudience(
  gender: AppGender | null | undefined,
): "men" | "women" {
  return gender === "female" ? "women" : "men";
}

export async function getFeaturesSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(FEATURES_SEEN_KEY)) === "1";
}

export async function setFeaturesSeen(): Promise<void> {
  await AsyncStorage.setItem(FEATURES_SEEN_KEY, "1");
}

export async function getTermsAccepted(): Promise<boolean> {
  return (await AsyncStorage.getItem(TERMS_KEY)) === "1";
}

export async function setTermsAccepted(): Promise<void> {
  await AsyncStorage.setItem(TERMS_KEY, "1");
}

export async function getScanPromoSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(SCAN_PROMO_KEY)) === "1";
}

export async function setScanPromoSeen(): Promise<void> {
  await AsyncStorage.setItem(SCAN_PROMO_KEY, "1");
}

export async function getNotifPromoSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIF_PROMO_KEY)) === "1";
}

export async function setNotifPromoSeen(): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PROMO_KEY, "1");
}

export async function getWelcomeSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(WELCOME_SEEN_KEY)) === "1";
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
