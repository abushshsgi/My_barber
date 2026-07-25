import { apiJson } from "@/lib/api";
import { uzRegionCodeFromLabel } from "@/lib/uz-regions";

/** Shahar matni va GPS mos kelmasa — foydalanuvchiga ko'rsatiladigan xato. */
export async function validateSalonCityCoords(
  city: string,
  lat: number,
  lng: number,
): Promise<string | null> {
  const region = uzRegionCodeFromLabel(city);
  if (!region) return null;
  try {
    const data = await apiJson<{
      matches_selected: boolean | null;
      region_from_gps_label: string;
    }>(
      `/api/v1/geo/validate/?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}&region=${encodeURIComponent(region)}`,
    );
    if (data.matches_selected === false) {
      const gpsLabel = data.region_from_gps_label || "boshqa hudud";
      return `Manzil «${city}» deb ko'rsatilgan, lekin xarita nuqtasi ${gpsLabel}da. Iltimos, xaritada to'g'ri joyni belgilang.`;
    }
  } catch {
    // Geo API ishlamasa — salon yaratishni to'xtatmaymiz.
    return null;
  }
  return null;
}
