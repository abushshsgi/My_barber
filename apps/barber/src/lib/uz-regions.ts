/** O'zbekiston viloyatlari — backend `UzRegion` bilan mos keladi. */
export const UZ_REGIONS = [
  { value: "TOSHKENT_SH", label: "Toshkent shahri" },
  { value: "TOSHKENT_V", label: "Toshkent viloyati" },
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
  { value: "XORAZM", label: "Xorazm viloyati" },
] as const;

export type UzRegionCode = (typeof UZ_REGIONS)[number]["value"];

export function uzRegionLabel(code: string | null | undefined): string {
  if (!code) return "";
  const row = UZ_REGIONS.find((r) => r.value === code);
  if (row) return row.label;
  const byLabel = UZ_REGIONS.find((r) => r.label.toLowerCase() === code.trim().toLowerCase());
  return byLabel?.label ?? code;
}

export function uzRegionCodeFromLabel(label: string): UzRegionCode | "" {
  const row = UZ_REGIONS.find((r) => r.label.toLowerCase() === label.trim().toLowerCase());
  return row?.value ?? "";
}
