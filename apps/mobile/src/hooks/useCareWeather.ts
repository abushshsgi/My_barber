import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { validateLocation } from "../api/geo";
import { fetchWeatherCare, type WeatherCarePayload } from "../api/weather";
import { useAuth } from "../auth/AuthContext";
import {
  loadCareWeatherCache,
  saveCareWeatherCache,
} from "../lib/care-weather-cache";
import { getGuestLocation } from "../lib/guest";
import { loadCareQuiz } from "../lib/morph-ai-care";
import { scheduleWeatherMorningAlert } from "../lib/weather-morning-alert";
import {
  loadPreferredWeatherRegion,
  savePreferredWeatherRegion,
} from "../lib/weather-region-prefs";
import {
  regionLabel,
  resolveUzRegion,
  type UzRegionId,
} from "../lib/uz-regions";

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

type Coords = { lat: number | null; lon: number | null };

type WeatherStore = {
  data: WeatherCarePayload | null;
  regionId: UzRegionId | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();

let store: WeatherStore = {
  data: null,
  regionId: null,
  loading: false,
  refreshing: false,
  error: null,
};

let preferredRegion: UzRegionId | null = null;
let bootStarted = false;
let fetchSeq = 0;

function emit() {
  listeners.forEach((l) => l());
}

function patch(partial: Partial<WeatherStore>) {
  store = { ...store, ...partial };
  emit();
}

async function resolveCoordsFast(
  savedLat: number | null,
  savedLon: number | null,
): Promise<Coords> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status === "granted") {
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last) {
        return { lat: last.coords.latitude, lon: last.coords.longitude };
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (pos) {
        return { lat: pos.coords.latitude, lon: pos.coords.longitude };
      }
    }
  } catch {
    /* GPS yo‘q */
  }

  if (savedLat != null && savedLon != null) {
    return { lat: savedLat, lon: savedLon };
  }

  const guest = await getGuestLocation().catch(() => null);
  return {
    lat: guest?.latitude ?? null,
    lon: guest?.longitude ?? null,
  };
}

async function enrichLocation(payload: WeatherCarePayload): Promise<WeatherCarePayload> {
  const hasRegion = Boolean(payload.location_region?.trim());
  const hasPlace = Boolean(payload.location_place?.trim());
  if (hasRegion && hasPlace) return payload;

  const lat = payload.latitude;
  const lon = payload.longitude;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return payload;

  const validated = await validateLocation(lat, lon).catch(() => null);
  if (!validated) return payload;

  const region =
    payload.location_region?.trim() ||
    validated.region_from_gps_label?.trim() ||
    validated.region_from_gps?.trim() ||
    "";
  const place =
    payload.location_place?.trim() ||
    validated.city_label?.trim() ||
    "";
  const label =
    payload.location_label?.trim() ||
    [place, region].filter(Boolean).join(", ");

  return {
    ...payload,
    location_region: region,
    location_place: place,
    location_label: label,
  };
}

function withRegionFallback(
  payload: WeatherCarePayload,
  regionId: UzRegionId | null,
): WeatherCarePayload {
  if (!regionId) return payload;
  const label = regionLabel(regionId);
  return {
    ...payload,
    location_region: label,
    location_place: label,
    location_label: label,
    region_id: regionId,
  };
}

async function fetchAndCache(opts: {
  lat: number | null;
  lon: number | null;
  regionId: UzRegionId | null;
  preferManual: boolean;
}): Promise<{ payload: WeatherCarePayload; regionId: UzRegionId | null }> {
  const quiz = await loadCareQuiz().catch(() => null);
  let payload = await fetchWeatherCare({
    lat: opts.preferManual ? undefined : opts.lat ?? undefined,
    lon: opts.preferManual ? undefined : opts.lon ?? undefined,
    region_id: opts.regionId || undefined,
    condition: quiz?.condition,
    texture: quiz?.texture,
    ai: true,
  });
  if (!opts.preferManual) {
    payload = await enrichLocation(payload);
  }
  const regionId =
    opts.regionId ||
    resolveUzRegion({
      region: payload.location_region,
      place: payload.location_place || payload.location_label,
      lat: payload.latitude ?? opts.lat,
      lon: payload.longitude ?? opts.lon,
    });
  payload = withRegionFallback(payload, regionId);
  await saveCareWeatherCache({
    payload,
    regionId,
    savedAt: Date.now(),
  });
  void scheduleWeatherMorningAlert(payload.tomorrow_alert);
  return { payload, regionId };
}

async function runRefresh(opts: {
  silent?: boolean;
  regionId?: UzRegionId | null;
  savedLat?: number | null;
  savedLon?: number | null;
}) {
  const silent = opts.silent ?? false;
  const seq = ++fetchSeq;

  if (opts.regionId !== undefined) {
    preferredRegion = opts.regionId;
    await savePreferredWeatherRegion(opts.regionId);
    // Chip/rasm darrov; eski ob-havo yangisi kelguncha saqlanadi (UI yo‘qolmasin).
    patch({
      regionId: opts.regionId,
      loading: !silent && !store.data,
      refreshing: !silent,
      error: null,
    });
  } else {
    if (preferredRegion == null) {
      preferredRegion = await loadPreferredWeatherRegion();
    }
    if (!silent && !store.data) patch({ loading: true, error: null });
    if (!silent && store.data) patch({ refreshing: true, error: null });
  }

  try {
    const preferred = preferredRegion;
    const { lat, lon } = preferred
      ? { lat: null as number | null, lon: null as number | null }
      : await resolveCoordsFast(opts.savedLat ?? null, opts.savedLon ?? null);

    if (!preferred) {
      const quickId = resolveUzRegion({ lat, lon, region: null, place: null });
      if (quickId && seq === fetchSeq) patch({ regionId: quickId });
    }

    const { payload, regionId: id } = await fetchAndCache({
      lat,
      lon,
      regionId: preferred,
      preferManual: Boolean(preferred),
    });

    if (seq !== fetchSeq) return;

    patch({
      data: payload,
      regionId: id || preferred,
      loading: false,
      refreshing: false,
      error: null,
    });
  } catch {
    if (seq !== fetchSeq) return;
    patch({
      loading: false,
      refreshing: false,
      error: store.data ? null : "care.weather.loadError",
    });
  }
}

export async function prefetchCareWeather(opts?: {
  savedLat?: number | null;
  savedLon?: number | null;
}): Promise<void> {
  try {
    preferredRegion = await loadPreferredWeatherRegion();
    const cached = await loadCareWeatherCache();
    const cacheMatches =
      cached?.payload &&
      (preferredRegion
        ? cached.regionId === preferredRegion
        : Boolean(cached.payload.current));
    if (cacheMatches && Date.now() - cached!.savedAt < 45 * 60 * 1000) {
      store = {
        ...store,
        data: cached!.payload,
        regionId: preferredRegion || cached!.regionId,
      };
      return;
    }
    await runRefresh({
      silent: true,
      savedLat: opts?.savedLat ?? null,
      savedLon: opts?.savedLon ?? null,
    });
  } catch {
    /* silent */
  }
}

async function bootWeather(savedLat: number | null, savedLon: number | null) {
  if (bootStarted) return;
  bootStarted = true;

  preferredRegion = await loadPreferredWeatherRegion();
  const cached = await loadCareWeatherCache();
  const cacheOk =
    cached?.payload &&
    (!preferredRegion || cached.regionId === preferredRegion);

  if (cacheOk && cached) {
    patch({
      data: cached.payload,
      regionId: preferredRegion || cached.regionId,
      loading: false,
    });
    void runRefresh({ silent: true, savedLat, savedLon });
    return;
  }

  await runRefresh({ silent: false, savedLat, savedLon });
}

export function useCareWeather() {
  const { user } = useAuth();
  const [, tick] = useState(0);

  useEffect(() => {
    const onChange = () => tick((n) => n + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    void bootWeather(parseCoord(user?.latitude), parseCoord(user?.longitude));
  }, [user?.latitude, user?.longitude]);

  const refresh = useCallback(async () => {
    await runRefresh({
      silent: false,
      savedLat: parseCoord(user?.latitude),
      savedLon: parseCoord(user?.longitude),
    });
  }, [user?.latitude, user?.longitude]);

  const setRegion = useCallback(
    async (id: UzRegionId) => {
      await runRefresh({
        silent: false,
        regionId: id,
        savedLat: parseCoord(user?.latitude),
        savedLon: parseCoord(user?.longitude),
      });
    },
    [user?.latitude, user?.longitude],
  );

  const clearManualRegion = useCallback(async () => {
    preferredRegion = null;
    await savePreferredWeatherRegion(null);
    await runRefresh({
      silent: false,
      regionId: null,
      savedLat: parseCoord(user?.latitude),
      savedLon: parseCoord(user?.longitude),
    });
  }, [user?.latitude, user?.longitude]);

  return {
    data: store.data,
    regionId: store.regionId,
    loading: store.loading,
    refreshing: store.refreshing,
    error: store.error,
    refresh,
    setRegion,
    clearManualRegion,
    preferredRegionId: preferredRegion,
  };
}
