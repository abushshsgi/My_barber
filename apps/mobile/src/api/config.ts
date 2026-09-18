import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API = "https://api.mysaloon.uz";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  googleClientId?: string;
  googleAndroidClientId?: string;
};

const fromExtra =
  typeof extra.apiUrl === "string" ? extra.apiUrl.trim() : "";

/** Env → app.config extra → production default (trailing slash yo‘q). */
function configuredApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim() || "";
  return (env || fromExtra || DEFAULT_API).replace(/\/+$/, "");
}

function resolveApiBase(): string {
  // Expo web (localhost): Metro `/api` + `/media` proxy — CORS yo‘q.
  if (Platform.OS === "web" && typeof __DEV__ !== "undefined" && __DEV__) {
    return "";
  }
  return configuredApiUrl();
}

/** Native: to‘liq API URL. Web dev: same-origin (proxy) → "". */
export const API_BASE = resolveApiBase();

/**
 * Absolute origin (media, refresh, map-config).
 * Web proxy rejimida ham haqiqiy backend host kerak — API_BASE bilan bir xil manbadan.
 */
export const API_ORIGIN = configuredApiUrl();

export function getExtraGoogleClientId(): string {
  return typeof extra.googleClientId === "string" ? extra.googleClientId.trim() : "";
}

/** Native Google Sign-In uchun (AuthSession browser oqimida ishlatilmaydi). */
export function getExtraGoogleAndroidClientId(): string {
  return typeof extra.googleAndroidClientId === "string"
    ? extra.googleAndroidClientId.trim()
    : "";
}
