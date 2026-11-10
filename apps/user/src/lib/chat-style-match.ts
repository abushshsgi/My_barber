import type { ChatHairstyleCard } from "@/lib/api/ai";
import { fetchHairstyles, type ApiHairstyle } from "@/lib/api/hairstyles";

const MAX_CARDS = 4;

const ALIASES: Record<string, string> = {
  "crop cut": "textured crop",
  "classic pompadour": "pompadour",
  "textured quiff": "quiff",
  "low taper fade": "low fade",
  "low taper": "low fade",
};

const catalogCache = new Map<"men" | "women", Promise<ApiHairstyle[]>>();

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’`ʻ]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function audienceOf(text: string): "men" | "women" | null {
  const t = norm(text);
  const men = /(erkak|мужск|male|\bmens?\b)/.test(t);
  const women = /(ayol|qizlar|qizcha|женск|female|\bwomens?\b)/.test(t);
  if (men && !women) return "men";
  if (women && !men) return "women";
  return null;
}

function loadCatalog(audience: "men" | "women"): Promise<ApiHairstyle[]> {
  const cached = catalogCache.get(audience);
  if (cached) return cached;
  const pending = fetchHairstyles(audience)
    .then((rows) => (Array.isArray(rows) ? rows : []))
    .catch(() => {
      catalogCache.delete(audience);
      return [] as ApiHairstyle[];
    });
  catalogCache.set(audience, pending);
  return pending;
}

function haystack(reply: string): string {
  let text = norm(reply);
  for (const [from, to] of Object.entries(ALIASES)) {
    if (text.includes(from)) text += ` ${to}`;
  }
  return ` ${text} `;
}

function titlesOf(row: ApiHairstyle): string[] {
  return [row.title, row.title_uz]
    .map((item) => norm(item || ""))
    .filter((item) => item.length >= 4);
}

export function pickHairstyleCards(reply: string, rows: ApiHairstyle[]): ChatHairstyleCard[] {
  const hay = haystack(reply);
  const hits = rows
    .map((row) => {
      const titles = titlesOf(row);
      const matched = titles.find((title) => hay.includes(` ${title} `));
      return matched ? { row, len: matched.length } : null;
    })
    .filter((item): item is { row: ApiHairstyle; len: number } => item != null)
    .sort((a, b) => b.len - a.len);

  const picked: ApiHairstyle[] = [];
  for (const hit of hits) {
    const title = norm(hit.row.title);
    const covered = picked.some((row) => {
      const longer = norm(row.title);
      return longer !== title && longer.includes(title) && hay.includes(` ${longer} `);
    });
    if (covered) continue;
    picked.push(hit.row);
    if (picked.length >= MAX_CARDS) break;
  }

  return picked.map((row) => ({
    id: row.id,
    name: (row.title_uz || row.title || row.id).trim(),
    image_url: row.image_url,
    description: (row.description_uz || "").trim(),
    audience: row.audience,
    gender: row.audience === "women" ? "female" : "male",
    tags: row.tags,
  }));
}

export async function matchReplyHairstyles(
  reply: string,
  userText: string,
): Promise<ChatHairstyleCard[]> {
  const hint = audienceOf(userText) || audienceOf(reply);
  const rows = hint
    ? await loadCatalog(hint)
    : (await Promise.all([loadCatalog("men"), loadCatalog("women")])).flat();
  if (!rows.length) return [];
  return pickHairstyleCards(reply, rows);
}
