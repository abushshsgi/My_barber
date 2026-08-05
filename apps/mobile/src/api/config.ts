import Constants from "expo-constants";

const DEFAULT_API = "https://api.mysaloon.uz";

function fromExtra(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl?.trim() || "";
}

/** Production API. Override: EXPO_PUBLIC_API_URL yoki app.json extra.apiUrl. */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || fromExtra() || DEFAULT_API
).replace(/\/+$/, "");
