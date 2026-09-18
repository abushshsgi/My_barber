import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WeatherCarePayload } from "../api/weather";
import type { UzRegionId } from "./uz-regions";

const KEY = "mysaloon.care.weather.cache.v1";
const TTL_MS = 45 * 60 * 1000;

export type CareWeatherCache = {
  payload: WeatherCarePayload;
  regionId: UzRegionId | null;
  savedAt: number;
};

export async function loadCareWeatherCache(): Promise<CareWeatherCache | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareWeatherCache;
    if (!parsed?.payload?.current || !Number.isFinite(parsed.savedAt)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCareWeatherCache(cache: CareWeatherCache): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

export function isCareWeatherCacheFresh(cache: CareWeatherCache | null): boolean {
  if (!cache) return false;
  return Date.now() - cache.savedAt < TTL_MS;
}
