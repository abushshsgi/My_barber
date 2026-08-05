/** Production API. Devda EXPO_PUBLIC_API_URL bilan override qilish mumkin. */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || "https://api.mysaloon.uz"
).replace(/\/+$/, "");
