import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import { fetchWeatherCare, type WeatherCarePayload } from "../api/weather";
import { useAuth } from "../auth/AuthContext";
import { getGuestLocation } from "../lib/guest";
import { loadCareQuiz } from "../lib/morph-ai-care";

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
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
      const guest = await getGuestLocation();
      let lat = parseCoord(user?.latitude) ?? guest?.latitude ?? null;
      let lon = parseCoord(user?.longitude) ?? guest?.longitude ?? null;

      if (lat == null || lon == null) {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") {
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status === "granted") {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }).catch(() => null);
            if (pos) {
              lat = pos.coords.latitude;
              lon = pos.coords.longitude;
            }
          }
        } else {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);
          if (pos) {
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
          }
        }
      }

      const quiz = await loadCareQuiz().catch(() => null);
      const payload = await fetchWeatherCare({
        lat: lat ?? undefined,
        lon: lon ?? undefined,
        condition: quiz?.condition,
        texture: quiz?.texture,
      });
      setData(payload);
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
