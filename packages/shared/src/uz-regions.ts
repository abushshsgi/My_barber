import { apiList } from "./api";

/** O'zbekistonning 12 ta viloyati — backend `UzRegion` bilan mos keladi. */
export const UZ_REGIONS = [
  { value: "ANDIJON", label: "Andijon viloyati" },
  { value: "BUXORO", label: "Buxoro viloyati" },
  { value: "FARGONA", label: "Farg'ona viloyati" },
  { value: "JIZZAX", label: "Jizzax viloyati" },
  { value: "QASHQADARYO", label: "Qashqadaryo viloyati" },
  { value: "NAVOIY", label: "Navoiy viloyati" },
  { value: "NAMANGAN", label: "Namangan viloyati" },
  { value: "SAMARQAND", label: "Samarqand viloyati" },
  { value: "SURXONDARYO", label: "Surxondaryo viloyati" },
  { value: "SIRDARYO", label: "Sirdaryo viloyati" },
  { value: "TOSHKENT_V", label: "Toshkent viloyati" },
  { value: "XORAZM", label: "Xorazm viloyati" },
] as const;

export type UzRegionCode = (typeof UZ_REGIONS)[number]["value"];
export type UzRegionOption = { value: string; label: string };

export function uzRegionLabel(code: string | null | undefined): string {
  if (!code) return "—";
  const row = UZ_REGIONS.find((r) => r.value === code);
  return row?.label ?? code;
}

export async function fetchUzRegions(): Promise<UzRegionOption[]> {
  try {
    const rows = await apiList<UzRegionOption>("/api/v1/regions/");
    return rows.length > 0 ? rows : [...UZ_REGIONS];
  } catch {
    return [...UZ_REGIONS];
  }
}
