/**
 * GeoJSON `ADM1_EN` → ichki viloyat kodi (filtr bilan mos).
 * Manba: akbartus/GeoJSON-Uzbekistan (OSM, GPL-3.0) — admin public/geo/uzbekistan_viloyats.geojson
 */
export const GEO_ADM1_TO_REGION: Record<string, string> = {
  "Tashkent city": "TOSHKENT_SH",
  "Namangan region": "NAMANGAN",
  "Tashkent region": "TOSHKENT_V",
  "Fergana region": "FARGONA",
  "Andijan region": "ANDIJON",
  "Syrdarya region": "SIRDARYO",
  "Jizzakh region": "JIZZAX",
  "Navoi region": "NAVOIY",
  "Samarkand region": "SAMARQAND",
  "Kashkadarya province": "QASHQADARYO",
  "Surkhandarya region": "SURXONDARYO",
  "Bukhara region": "BUXORO",
  "Khorezm region": "XORAZM",
  "Republic of Karakalpakstan": "QARAKALPAK",
};

/** Dropdowndagi kod → xarita poligonini ajratish (Toshkent viloyati faqat viloyat, shahar alohida). */
export function geoMatchesFilter(featureRegionCode: string, filterCode: string): boolean {
  if (!filterCode) return true;
  if (filterCode === "TOSHKENT_V") {
    return featureRegionCode === "TOSHKENT_V";
  }
  return featureRegionCode === filterCode;
}
