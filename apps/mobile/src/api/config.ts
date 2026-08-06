import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API = "https://api.mysaloon.uz";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiUrl?: string;
  googleClientId?: string;
};

const fromExtra =
  typeof extra.apiUrl === "string" ? extra.apiUrl.trim() : "";

function resolveApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL?.trim() || fromExtra || "";

  // Expo web (localhost): Metro `/api` + `/media` proxy — CORS yo‘q.
  if (Platform.OS === "web" && typeof __DEV__ !== "undefined" && __DEV__) {
    return "";
  }

  return (env || DEFAULT_API).replace(/\/+$/, "");
}

/** Native: api.mysaloon.uz. Web dev: same-origin (proxy). */
export const API_BASE = resolveApiBase();

export const API_ORIGIN = (fromExtra || DEFAULT_API).replace(/\/+$/, "");

export function getExtraGoogleClientId(): string {
  return typeof extra.googleClientId === "string" ? extra.googleClientId.trim() : "";
}
