const GENERIC_NAMES = new Set(["foydalanuvchi", "user", "пользователь"]);

export function resolveSharerFirstName(raw?: string | null): string {
  const value = (raw || "").trim();
  if (!value) return "";
  const first = value.split(/\s+/)[0] || "";
  if (!first || GENERIC_NAMES.has(first.toLowerCase())) return "";
  return first.length > 16 ? first.slice(0, 16) : first;
}

/** Har foydalanuvchiga 3 tadan 1 tasi — id bo‘yicha barqaror. */
const NAMED_HEADLINES = [
  (name: string) => `${name}ning yangi obrazini ko‘ring`,
  (name: string) => `${name} yangi lookda`,
  (name: string) => `${name}ning yangi soch uslubi`,
] as const;

const ANON_HEADLINES = [
  "Yangi obrazni ko‘ring",
  "Yangi look tayyor",
  "Yangi soch uslubi",
] as const;

function pickForUser<T>(key: string, items: readonly T[]): T {
  if (!key) {
    return items[Math.floor(Math.random() * items.length)] ?? items[0]!;
  }
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length] ?? items[0]!;
}

export function pickInstagramHeadline(opts: {
  userKey?: string | number | null;
  userName?: string | null;
}): string {
  const name = resolveSharerFirstName(opts.userName);
  const key = String(opts.userKey ?? name ?? "");
  if (name) return pickForUser(key, NAMED_HEADLINES)(name);
  return pickForUser(key, ANON_HEADLINES);
}

export const INSTAGRAM_CTA = "Siz ham Morf AI bilan sinab ko‘ring";
