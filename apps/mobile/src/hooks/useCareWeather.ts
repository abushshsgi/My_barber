import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { validateLocation } from "../api/geo";
import { fetchWeatherCare, type WeatherCarePayload } from "../api/weather";
import { useAuth } from "../auth/AuthContext";
import { getGuestLocation } from "../lib/guest";
import { loadCareQuiz } from "../lib/morph-ai-care";

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Avval GPS, keyin saqlangan profil / mehmon joylashuvi. */
async function resolveCoords(
  savedLat: number | null,
  savedLon: number | null,
): Promise<{ lat: number | null; lon: number | null }> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      perm = await Location.requestForegroundPermissionsAsync();
    }
    if (perm.status === "granted") {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);
      if (pos) {
        return { lat: pos.coords.latitude, lon: pos.coords.longitude };
      }
    }
  } catch {
    /* GPS yo‘q — fallback */
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

export function useCareWeather() {
  const { user } = useAuth();
  const [data, setData] = useState<WeatherCarePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const savedLat = parseCoord(user?.latitude);
      const savedLon = parseCoord(user?.longitude);
      const { lat, lon } = await resolveCoords(savedLat, savedLon);

      const quiz = await loadCareQuiz().catch(() => null);
      const payload = await fetchWeatherCare({
        lat: lat ?? undefined,
        lon: lon ?? undefined,
        condition: quiz?.condition,
        texture: quiz?.texture,
      });
      setData(await enrichLocation(payload));
    } catch {
      setError("care.weather.loadError");
    } finally {
      setLoading(false);
    }
  }, [user?.latitude, user?.longitude]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
