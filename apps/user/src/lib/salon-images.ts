import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { resolveMediaUrl } from "@/lib/media-url";

function isStockOrPlaceholder(url: string): boolean {
  const u = url.toLowerCase();
  return (
    u.includes("placeholder-salon") ||
    u.includes("/covers/pexels/") ||
    u.includes("images.pexels.com") ||
    u.includes("picsum.photos")
  );
}

/** Bir xil rasmning same-origin va api.mysaloon.uz variantlari. */
export function mediaUrlCandidates(url: string): string[] {
  const trimmed = url.trim();
  if (!trimmed) return [];
  const resolved = resolveMediaUrl(trimmed) ?? trimmed;
  const out: string[] = [];
  const push = (u: string) => {
    if (u && !out.includes(u)) out.push(u);
  };

  push(resolved);
  push(trimmed);

  const apiMatch = trimmed.match(/^https?:\/\/(?:api\.mysaloon\.uz|[a-z0-9-]+\.up\.railway\.app)(\/media\/.+)$/i);
  if (apiMatch?.[1]) {
    push(apiMatch[1]);
    push(`https://api.mysaloon.uz${apiMatch[1]}`);
  }

  if (resolved.startsWith("/media/")) {
    push(`https://api.mysaloon.uz${resolved}`);
  }

  return out.filter((u) => !isStockOrPlaceholder(u) || u === PLACEHOLDER_SALON);
}

/** Cover + gallery — faqat haqiqiy yuklangan rasmlar, unique. */
export function collectSalonImageUrls(input: {
  coverUrl?: string | null;
  portfolio?: string[] | null;
}): string[] {
  const raw = [input.coverUrl, ...(input.portfolio ?? [])]
    .map((u) => {
      const trimmed = u?.trim();
      if (!trimmed) return null;
      if (isStockOrPlaceholder(trimmed)) return null;
      return resolveMediaUrl(trimmed) ?? trimmed;
    })
    .filter((u): u is string => Boolean(u) && !isStockOrPlaceholder(u));

  return raw.filter((url, i, arr) => arr.indexOf(url) === i);
}

export function salonCarouselImages(input: {
  coverUrl?: string | null;
  portfolio?: string[] | null;
}): string[] {
  const unique = collectSalonImageUrls(input);
  return unique.length > 0 ? unique : [PLACEHOLDER_SALON];
}
