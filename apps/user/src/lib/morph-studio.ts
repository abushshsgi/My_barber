/** Vaqtincha yopiq — qayta yoqish uchun true qiling. */
export const MORPH_STUDIO_ENABLED = false;

export function withoutStudioFeatures<T extends { key: string }>(features: T[]): T[] {
  if (MORPH_STUDIO_ENABLED) return features;
  return features.filter((feature) => feature.key !== "studio");
}
