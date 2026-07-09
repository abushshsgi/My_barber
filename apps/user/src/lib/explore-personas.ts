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

/** Erkaklar katalogidagi barcha uslub sluglari. */
export const MEN_CATALOG_STYLE_SLUGS = [
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

/** Generatsiya qilingan persona assetlari */
/** Niki uchun hozircha low-fade yo'q (front rasmlari keyin qo'shiladi). */
export const NIKI_READY_SLUGS = MEN_CATALOG_STYLE_SLUGS.filter(
  (slug) => slug !== "low-fade",
);

export const PERSONA_READY_ASSETS: Record<
  ExplorePersonaId,
  { reference: boolean; slugs: readonly string[] }
> = {
  irland: { reference: true, slugs: MEN_CATALOG_STYLE_SLUGS },
  slavyan: { reference: true, slugs: MEN_CATALOG_STYLE_SLUGS },
  niki: { reference: true, slugs: NIKI_READY_SLUGS },
};

export function hasPersonaReference(personaId: ExplorePersonaId): boolean {
  return PERSONA_READY_ASSETS[personaId].reference;
}

export function hasPersonaStyleAsset(personaId: ExplorePersonaId, slug: string): boolean {
  return PERSONA_READY_ASSETS[personaId].slugs.includes(slug);
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

export function getPersonaStyleImageUrl(personaId: ExplorePersonaId, slug: string): string {
  if (hasPersonaStyleAsset(personaId, slug)) {
    return `/hairstyles/men/personas/${personaId}/${slug}.webp`;
  }
  return `/hairstyles/men/${slug}.webp`;
}
