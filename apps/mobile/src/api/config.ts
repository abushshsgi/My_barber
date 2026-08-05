import appJson from "../../app.json";

const DEFAULT_API = "https://api.mysaloon.uz";

const fromExtra =
  typeof appJson?.expo?.extra?.apiUrl === "string"
    ? appJson.expo.extra.apiUrl.trim()
    : "";

/** Production API. Override: EXPO_PUBLIC_API_URL yoki app.json extra.apiUrl. */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || fromExtra || DEFAULT_API
).replace(/\/+$/, "");
