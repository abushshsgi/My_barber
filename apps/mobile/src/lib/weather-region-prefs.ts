import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UzRegionId } from "./uz-regions";

const REGION_KEY = "mysaloon.care.weather.preferredRegion.v1";

export async function loadPreferredWeatherRegion(): Promise<UzRegionId | null> {
  try {
    const raw = (await AsyncStorage.getItem(REGION_KEY))?.trim().toLowerCase();
    if (!raw) return null;
    return raw as UzRegionId;
  } catch {
    return null;
  }
}

export async function savePreferredWeatherRegion(id: UzRegionId | null): Promise<void> {
  try {
    if (!id) await AsyncStorage.removeItem(REGION_KEY);
    else await AsyncStorage.setItem(REGION_KEY, id);
  } catch {
    /* ignore */
  }
}
