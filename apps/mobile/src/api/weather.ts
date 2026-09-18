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
  uv_index_max?: number | null;
};

export type WeatherHour = {
  time: string;
  hour: number;
  temperature_c: number | null;
  weather_code: number | null;
  condition_key: WeatherConditionKey;
  wind_kmh: number | null;
  precip_probability: number | null;
  uv_index: number | null;
};

export type WeatherPrimaryAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

export type WeatherProductPlanItem = {
  product_id: number | null;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  how_to_use: string;
  tip: string;
  priority?: number;
};

export type WeatherUv = {
  index: number | null;
  level: string;
  tip: string;
};

export type WeatherTomorrowAlert = {
  title: string;
  body: string;
  kind: string;
} | null;

export type WeatherCarePayload = {
  location_label: string;
  location_place?: string;
  location_region?: string;
  region_id?: string | null;
  latitude: number;
  longitude: number;
  current: {
    temperature_c: number | null;
    humidity_pct: number | null;
    wind_kmh: number | null;
    weather_code: number | null;
    condition_key: WeatherConditionKey;
    uv_index?: number | null;
  };
  uv?: WeatherUv;
  hours?: WeatherHour[];
  hourly_highlight?: string | null;
  primary_action?: WeatherPrimaryAction;
  product_plan?: WeatherProductPlanItem[];
  days: WeatherDay[];
  summary: string;
  recommendations: string[];
  tomorrow_alert?: WeatherTomorrowAlert;
  ai_enriched?: boolean;
};

export type WeatherRegion = {
  id: string;
  label_uz: string;
  latitude: number;
  longitude: number;
};

export async function fetchWeatherCare(params?: {
  lat?: number;
  lon?: number;
  region_id?: string;
  condition?: string;
  texture?: string;
  ai?: boolean;
}): Promise<WeatherCarePayload> {
  return apiJson(
    `/api/v1/ai/care/weather/${qs({
      lat: params?.lat,
      lon: params?.lon,
      region_id: params?.region_id,
      condition: params?.condition,
      texture: params?.texture,
      ai: params?.ai ? "1" : undefined,
    })}`,
  );
}

export async function fetchWeatherRegions(): Promise<WeatherRegion[]> {
  const data = await apiJson<{ regions?: WeatherRegion[] }>("/api/v1/ai/care/weather/regions/");
  return Array.isArray(data?.regions) ? data.regions : [];
}

export function weatherIconName(
  key: WeatherConditionKey,
): keyof typeof import("@expo/vector-icons").Ionicons.glyphMap {
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
