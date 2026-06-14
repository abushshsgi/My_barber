export type ExplorePersonaId = "britan" | "irland" | "slavyan" | "evro" | "fransuz";

export type ExplorePersona = {
  id: ExplorePersonaId;
  label: string;
  code: string;
};

/** Foydalanuvchi tasdiqlagan 5 ta reference prompt tartibi */
export const EXPLORE_PERSONAS: ExplorePersona[] = [
  { id: "britan", label: "Britan", code: "EU-3" },
  { id: "irland", label: "Irland", code: "EU-8" },
  { id: "slavyan", label: "Slavyan", code: "EU-6" },
  { id: "evro", label: "Evro", code: "EU-2" },
  { id: "fransuz", label: "Fransuz", code: "EU-4" },
];

export const DEFAULT_EXPLORE_PERSONA: ExplorePersonaId = "evro";

/** Generatsiya qilingan persona assetlari */
export const PERSONA_READY_ASSETS: Record<
  ExplorePersonaId,
  { reference: boolean; slugs: readonly string[] }
> = {
  britan: { reference: false, slugs: [] },
  irland: { reference: false, slugs: [] },
  slavyan: { reference: false, slugs: [] },
  evro: {
    reference: true,
    slugs: ["mid-fade", "skin-fade", "buzz-cut", "textured-crop"],
  },
  fransuz: { reference: false, slugs: [] },
};

export function hasPersonaReference(personaId: ExplorePersonaId): boolean {
  return PERSONA_READY_ASSETS[personaId].reference;
}

export const EXPLORE_PERSONA_STORAGE_KEY = "mysaloon.explore.persona";

export function isExplorePersonaId(value: string | null | undefined): value is ExplorePersonaId {
  if (value === "skandinav") return false;
  return EXPLORE_PERSONAS.some((persona) => persona.id === value);
}

export function normalizeExplorePersonaId(value: string | null | undefined): ExplorePersonaId {
  if (isExplorePersonaId(value)) return value;
  if (value === "skandinav") return "evro";
  return DEFAULT_EXPLORE_PERSONA;
}

export function getPersonaRefImageUrl(personaId: ExplorePersonaId): string {
  return `/hairstyles/men/personas/${personaId}/reference.webp`;
}

export function getPersonaStyleImageUrl(personaId: ExplorePersonaId, slug: string): string {
  return `/hairstyles/men/personas/${personaId}/${slug}.webp`;
}
