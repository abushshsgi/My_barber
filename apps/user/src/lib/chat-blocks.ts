import type { ChatContentBlock, ChatHairstyleCard, ChatImageLayout } from "@/lib/api/ai";

const IMAGE_LAYOUTS = new Set<ChatImageLayout>([
  "single_image",
  "image_pair",
  "image_grid",
  "image_carousel",
  "comparison",
]);

export function layoutForCount(count: number, requested?: string): ChatImageLayout | "text" {
  const req = (requested || "").toLowerCase();
  if (count <= 0) return "text";
  if (count === 1) return "single_image";
  if (count === 2) return req === "comparison" ? "comparison" : "image_pair";
  if (req === "comparison") return "comparison";
  if (count <= 4) return req === "image_carousel" ? "image_carousel" : "image_grid";
  return "image_carousel";
}

export function cardsFromBlocks(blocks?: ChatContentBlock[] | null): ChatHairstyleCard[] {
  if (!blocks?.length) return [];
  const cards: ChatHairstyleCard[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    if (!block || block.type === "text" || !Array.isArray(block.items)) continue;
    for (const item of block.items) {
      if (!item?.id || !item.image_url || seen.has(item.id)) continue;
      seen.add(item.id);
      cards.push(item);
    }
  }
  return cards;
}

export function historyStyleRefs(message: {
  hairstyles?: ChatHairstyleCard[];
  blocks?: ChatContentBlock[];
}): Array<Pick<ChatHairstyleCard, "id" | "name" | "audience" | "gender">> {
  const cards = message.hairstyles?.length ? message.hairstyles : cardsFromBlocks(message.blocks);
  return cards.slice(0, 10).map((card) => ({
    id: card.id,
    name: card.name,
    audience: card.audience,
    gender: card.gender,
  }));
}

function splitAround(text: string): [string, string] {
  const raw = text.trim();
  if (!raw) return ["", ""];
  const parts = raw.split(/\n\s*\n/, 2);
  if (parts.length === 2 && parts[0]?.trim() && parts[1]?.trim()) {
    return [parts[0].trim(), parts[1].trim()];
  }
  const sentences = raw.split(/(?<=[.!?…])\s+/, 2);
  if (
    sentences.length === 2 &&
    sentences[0]?.trim() &&
    sentences[1]?.trim() &&
    sentences[0].length <= 320
  ) {
    return [sentences[0].trim(), sentences[1].trim()];
  }
  return [raw, ""];
}

/** Eski xabarlar: rasmlar matn oxirida emas, kirish va xulosa orasida. */
export function blocksFromLegacy(content: string, items: ChatHairstyleCard[]): ChatContentBlock[] {
  const cards = items.filter((item) => item?.id && item.image_url);
  const text = content.trim();
  if (!cards.length) return text ? [{ type: "text", content: text }] : [];
  const layout = layoutForCount(cards.length);
  const [intro, outro] = splitAround(text);
  const blocks: ChatContentBlock[] = [];
  if (intro) blocks.push({ type: "text", content: intro });
  blocks.push({ type: layout, items: cards });
  if (outro) blocks.push({ type: "text", content: outro });
  return blocks;
}

export function normalizeBlocks(blocks?: ChatContentBlock[] | null): ChatContentBlock[] {
  if (!Array.isArray(blocks)) return [];
  const cleaned: ChatContentBlock[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text") {
      const content = String(block.content || "").trim();
      if (content) cleaned.push({ type: "text", content });
      continue;
    }
    if (!IMAGE_LAYOUTS.has(block.type) || !Array.isArray(block.items)) continue;
    const items = block.items.filter((item) => item?.id && item.image_url);
    if (!items.length) continue;
    cleaned.push({ type: layoutForCount(items.length, block.type), items });
  }
  return cleaned;
}

export function visualBlocks(
  content: string,
  blocks?: ChatContentBlock[] | null,
  hairstyles?: ChatHairstyleCard[] | null,
): ChatContentBlock[] {
  const normalized = normalizeBlocks(blocks);
  if (normalized.length) return normalized;
  if (hairstyles?.length) return blocksFromLegacy(content, hairstyles);
  return [];
}
