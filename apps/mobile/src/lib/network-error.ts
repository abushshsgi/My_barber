/** RN/Android fetch xatolarini foydalanuvchi tiliga. */
export function friendlyNetworkError(err: unknown, apiBase?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();

  if (
    /unknownhostexception|no address associated with hostname|enotfound|getaddrinfo|network request failed|failed to fetch|internet|dns/i.test(
      lower,
    )
  ) {
    return "Internet aloqasi yo‘q yoki server topilmadi. Wi‑Fi yoki mobil internetni tekshirib, qayta urinib ko‘ring.";
  }

  if (/timeout|abort/i.test(lower)) {
    return "Server javob bermadi. Internetni tekshirib, qayta urinib ko‘ring.";
  }

  if (/502|503|504/.test(raw)) {
    return "Server vaqtincha javob bermayapti. Bir necha soniyadan keyin qayta urinib ko‘ring.";
  }

  // Texnik Java/stack izlarini yashirish
  if (/java\.|exception|at com\.|at java\./i.test(raw)) {
    return "Ulanishda xato. Internetni tekshirib, qayta urinib ko‘ring.";
  }

  if (apiBase && raw.includes(apiBase)) {
    return raw.replace(/\s*\([^)]*https?:\/\/[^)]+\)\s*$/i, "").trim() || raw;
  }

  return raw || "Yuklashda xato";
}
