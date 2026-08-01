export type ExplorePersonaId = "irland" | "slavyan" | "niki";

export type ExplorePersona = {
  id: ExplorePersonaId;
  label: string;
  code: string;
  reference_url?: string;
};

/** Foydalanuvchi tasdiqlagan Explore personajlari */
export const EXPLORE_PERSONAS: ExplorePersona[] = [
  { id: "irland", label: "Irland", code: "EU-8" },
  { id: "slavyan", label: "Slavyan", code: "EU-6" },
  { id: "niki", label: "Niki", code: "EU-9" },
];

export const DEFAULT_EXPLORE_PERSONA: ExplorePersonaId = "irland";

/** Home «Trendlar» qatori — faqat shu personaj rasmlari. */
export const HOME_TREND_PERSONA_IDS = ["irland", "niki"] as const satisfies readonly ExplorePersonaId[];

export type HomeTrendPersonaId = (typeof HOME_TREND_PERSONA_IDS)[number];

export function isHomeTrendPersonaId(value: ExplorePersonaId): value is HomeTrendPersonaId {
  return (HOME_TREND_PERSONA_IDS as readonly ExplorePersonaId[]).includes(value);
}

/** Arxiv — Old Money (faol emas). */
export const MEN_ARCHIVED_STYLE_SLUGS = [
  "old-money-loose-curl",
  "old-money-soft-wave",
  "old-money-defined-curl",
  "old-money-layered-curl",
  "old-money-tousled-curl",
] as const;

/** Faol katalog — klassik 12 + yangi 20 uslub. */
export const MEN_CLASSIC_STYLE_SLUGS = [
  "mid-fade",
  "low-fade",
  "skin-fade",
  "buzz-cut",
  "textured-crop",
  "pompadour",
  "undercut",
  "side-part",
  "french-crop",
  "slick-back",
  "curly-top-fade",
  "modern-mullet",
] as const;

export const MEN_NEW_STYLE_SLUGS = [
  "crew-cut",
  "high-fade",
  "taper-cut",
  "quiff",
  "ivy-league",
  "caesar-cut",
  "bro-flow",
  "curtain-fringe",
  "textured-fringe",
  "drop-fade",
  "burst-fade",
  "high-and-tight",
  "classic-taper",
  "soft-quiff",
  "forward-fringe",
  "layered-medium",
  "comb-over-fade",
  "faux-hawk",
  "messy-fringe",
  "disconnected-crop",
  "wet-curl-taper",
  "curly-two-block",
  "long-curly-hair",
  "drop-fade-curly",
  "curly-wolf-cut",
  "curly-flow",
  "curly-fringe",
  "curly-shag",
  "curly-undercut-style",
  "curly-ponytail",
  "curly-afro",
  "layered-curly",
  "curly-curtain-bangs",
  "curly-middle-part",
  "natural-curly",
  "medium-curly",
  "curly-slick-back",
  "curly-bowl-cut",
] as const;

export const MEN_CATALOG_STYLE_SLUGS = [
  ...MEN_CLASSIC_STYLE_SLUGS,
  ...MEN_NEW_STYLE_SLUGS,
] as const;

/** Yangi uslublar generate/publish qilinmaguncha bo'sh. */
export const NIKI_READY_SLUGS: readonly string[] = [];

/** Irland — barcha katalog uslublari (front). Multi-view klassik 12 da. */
export const IRLAND_READY_SLUGS: readonly string[] = [...MEN_CATALOG_STYLE_SLUGS];

export const PERSONA_READY_ASSETS: Record<
  ExplorePersonaId,
  { reference: boolean; slugs: readonly string[] }
> = {
  irland: { reference: true, slugs: IRLAND_READY_SLUGS },
  slavyan: { reference: true, slugs: [] },
  niki: { reference: true, slugs: [] },
};

export function hasPersonaReference(personaId: ExplorePersonaId): boolean {
  return PERSONA_READY_ASSETS[personaId].reference;
}

export function hasPersonaStyleAsset(personaId: ExplorePersonaId, slug: string): boolean {
  return PERSONA_READY_ASSETS[personaId].slugs.includes(slug);
}

/** Irland slugs that ship left/right/back static assets (not front-only). */
export const IRLAND_MULTI_VIEW_SLUGS = new Set([
  "buzz-cut",
  "crew-cut",
  "curly-afro",
  "curly-bowl-cut",
  "curly-curtain-bangs",
  "curly-flow",
  "curly-fringe",
  "curly-middle-part",
  "curly-ponytail",
  "curly-shag",
  "curly-slick-back",
  "curly-top-fade",
  "curly-two-block",
  "curly-undercut-style",
  "curly-wolf-cut",
  "drop-fade-curly",
  "french-crop",
  "layered-curly",
  "long-curly-hair",
  "low-fade",
  "medium-curly",
  "mid-fade",
  "modern-mullet",
  "natural-curly",
  "pompadour",
  "side-part",
  "skin-fade",
  "slick-back",
  "textured-crop",
  "undercut",
  "wet-curl-taper",
]);

export function hasPersonaStyleViewAsset(
  personaId: ExplorePersonaId,
  slug: string,
  view: "front" | "left" | "right" | "back",
): boolean {
  if (!hasPersonaStyleAsset(personaId, slug)) return false;
  if (view === "front") return true;
  if (personaId === "irland") return IRLAND_MULTI_VIEW_SLUGS.has(slug);
  return false;
}

/** Explore UI — faqat reference rasmi tayyor personajlar */
export function listReadyExplorePersonas(): ExplorePersona[] {
  return EXPLORE_PERSONAS.filter((persona) => hasPersonaReference(persona.id));
}

export const EXPLORE_PERSONA_STORAGE_KEY = "mysaloon.explore.persona";

export function isExplorePersonaId(value: string | null | undefined): value is ExplorePersonaId {
  if (value === "skandinav" || value === "fransuz" || value === "britan" || value === "evro") {
    return false;
  }
  return EXPLORE_PERSONAS.some((persona) => persona.id === value);
}

function defaultReadyExplorePersonaId(): ExplorePersonaId {
  const ready = listReadyExplorePersonas();
  if (ready.some((persona) => persona.id === DEFAULT_EXPLORE_PERSONA)) {
    return DEFAULT_EXPLORE_PERSONA;
  }
  return ready[0]?.id ?? DEFAULT_EXPLORE_PERSONA;
}

export function normalizeExplorePersonaId(value: string | null | undefined): ExplorePersonaId {
  if (
    value === "fransuz" ||
    value === "skandinav" ||
    value === "britan" ||
    value === "evro"
  ) {
    return defaultReadyExplorePersonaId();
  }
  if (isExplorePersonaId(value) && hasPersonaReference(value)) return value;
  return defaultReadyExplorePersonaId();
}

export function getPersonaRefImageUrl(personaId: ExplorePersonaId): string {
  return `/hairstyles/men/personas/${personaId}/reference.webp`;
}

/**
 * Katalog persona rasmlari — Vercel CDN `/hairstyles/` (DB `/media` emas).
 * `/media/hairstyles/...` → `/hairstyles/...` (Explore tezligi uchun).
 */
export function preferStaticHairstyleUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  const mediaCatalog = trimmed.match(
    /^(?:https?:\/\/[^/]+)?\/media\/(hairstyles\/(?:men|women)\/.+)$/i,
  );
  if (mediaCatalog) return `/${mediaCatalog[1]}`;
  return trimmed;
}

export function getPersonaStyleImageUrl(personaId: ExplorePersonaId, slug: string): string {
  if (hasPersonaStyleAsset(personaId, slug)) {
    return `/hairstyles/men/personas/${personaId}/${slug}.webp`;
  }
  return `/hairstyles/men/${slug}.webp`;
}

export function getPersonaStyleViewImageUrl(
  personaId: ExplorePersonaId,
  slug: string,
  view: "front" | "left" | "right" | "back" = "front",
): string {
  if (!hasPersonaStyleAsset(personaId, slug)) {
    return getPersonaStyleImageUrl(personaId, slug);
  }
  if (view === "front" || !hasPersonaStyleViewAsset(personaId, slug, view)) {
    return `/hairstyles/men/personas/${personaId}/${slug}.webp`;
  }
  return `/hairstyles/men/personas/${personaId}/${slug}__${view}.webp`;
}
