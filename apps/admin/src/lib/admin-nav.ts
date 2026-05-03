/** Barber detail `?returnTo=` — faqat ichki admin yo‘llar (ochiq redirect emas). */
export function sanitizeAdminReturnTo(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t.startsWith("/admin/")) return undefined;
  if (t.includes("//") || t.includes("\\")) return undefined;
  // `http:` yoki `javascript:` kabi sxema injectsiyasini bloklash
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return undefined;
  return t;
}

export function barberDetailSearchFromRaw(raw: Record<string, unknown>): { returnTo?: string } {
  const r = sanitizeAdminReturnTo(raw.returnTo);
  return r ? { returnTo: r } : {};
}
