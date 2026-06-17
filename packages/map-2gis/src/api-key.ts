/** Client-side 2GIS MapGL key (domain-restricted in 2GIS Console). */
export function getDgisApiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const key = env.VITE_DGIS_API_KEY ?? env.NEXT_PUBLIC_DGIS_API_KEY ?? "";
  return key.trim();
}
