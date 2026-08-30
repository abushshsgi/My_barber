import { apiJson, qs } from "./client";

export type WeatherConditionKey =
  | "clear"
  | "mainly_clear"
  | "partly_cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "storm"
  | "cloudy"
  | "unknown";

export type WeatherDay = {
  date: string;
  weekday_key: string;
  is_today: boolean;
  temperature_max_c: number | null;
  temperature_min_c: number | null;
  weather_code: number | null;
  condition_key: WeatherConditionKey;
};

export type WeatherCarePayload = {
  location_label: string;
  /** Mahalla / tuman / shahar — GPS reverse. */
  location_place?: string;
  /** Viloyat / shahar admin birligi. */
  location_region?: string;
  latitude: number;
  longitude: number;
  current: {
    temperature_c: number | null;
    humidity_pct: number | null;
    wind_kmh: number | null;
    weather_code: number | null;
    condition_key: WeatherConditionKey;
  };
  days: WeatherDay[];
  summary: string;
  recommendations: string[];
};

export async function fetchWeatherCare(params?: {
  lat?: number;
  lon?: number;
  condition?: string;
  texture?: string;
}): Promise<WeatherCarePayload> {
  return apiJson(
    `/api/v1/ai/care/weather/${qs({
      lat: params?.lat,
      lon: params?.lon,
      condition: params?.condition,
      texture: params?.texture,
    })}`,
  );
}

export function weatherIconName(key: WeatherConditionKey): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap {
  switch (key) {
    case "clear":
    case "mainly_clear":
      return "sunny-outline";
    case "partly_cloudy":
      return "partly-sunny-outline";
    case "overcast":
    case "cloudy":
      return "cloudy-outline";
    case "fog":
      return "cloud-outline";
    case "drizzle":
    case "rain":
    case "showers":
      return "rainy-outline";
    case "snow":
      return "snow-outline";
    case "storm":
      return "thunderstorm-outline";
    default:
      return "cloud-outline";
  }
}
