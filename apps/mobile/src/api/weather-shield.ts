import { apiJson, qs } from "./client";

export type WeatherShieldRec = {
  id: string;
  product_id?: number;
  type: string;
  title: string;
  description: string;
  priority: number;
  icon?: string;
  productTag?: string;
  image_url?: string;
  trigger?: string;
  category_key?: string;
  category_title?: string;
  hair_conditions?: string[];
};

export type WeatherShieldAlert = {
  id: string;
  label: string;
  severity: string;
  trigger: string;
};

export type WeatherShieldCatalogResponse = {
  triggers: string[];
  alerts: WeatherShieldAlert[];
  recommendations: WeatherShieldRec[];
  done_ids: string[];
};

export async function fetchWeatherShieldCatalog(params: {
  temp?: number | null;
  humidity?: number | null;
  uv?: number | null;
  wind?: number | null;
  aqi?: number | null;
  condition?: string;
  hair_condition?: string;
}): Promise<WeatherShieldCatalogResponse> {
  const path =
    "/api/v1/ai/care/weather-shield/" +
    qs({
      temp: params.temp ?? undefined,
      humidity: params.humidity ?? undefined,
      uv: params.uv ?? undefined,
      wind: params.wind ?? undefined,
      aqi: params.aqi ?? undefined,
      condition: params.condition,
      hair_condition: params.hair_condition,
    });
  const body = await apiJson<WeatherShieldCatalogResponse>(path);
  return {
    triggers: Array.isArray(body?.triggers) ? body.triggers : [],
    alerts: Array.isArray(body?.alerts) ? body.alerts : [],
    recommendations: Array.isArray(body?.recommendations) ? body.recommendations : [],
    done_ids: Array.isArray(body?.done_ids) ? body.done_ids : [],
  };
}

export async function postWeatherShieldAction(payload: {
  product_id?: number;
  action_key?: string;
  id?: string;
  completed?: boolean;
  weather_snapshot?: Record<string, unknown>;
}): Promise<{ ok: boolean; completed: boolean; id?: string }> {
  return apiJson("/api/v1/ai/care/weather-shield/actions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
