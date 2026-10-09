import { apiJson } from "./client";

export type CareProductCategory = "shampoo" | "balsam" | "mask" | "oil" | "spray" | "other";

export type CareProduct = {
  id: number;
  name: string;
  brand: string;
  slug: string;
  category: CareProductCategory | string;
  image_url: string | null;
  ingredients_text: string;
  ingredients: string[];
  usage_uz: string;
  purpose_uz: string;
  suitable_for: string[];
  not_suitable_for: string[];
  scalp_types?: string[];
  concerns?: string[];
  match_percent?: number | null;
  fit_verdict?: string | null;
  fit_reasons?: string[];
  usage_steps?: Array<{ title: string; desc: string; icon?: string }>;
  pros_uz: string;
  cons_uz: string;
  warnings_uz: string;
  is_published: boolean;
  sort_order: number;
  likes_count?: number;
  liked_by_me?: boolean;
};

export async function fetchCareProducts(params?: {
  q?: string;
  category?: string;
  recommended?: boolean;
  order?: "likes" | "popular" | string;
  exclude_mine?: boolean;
  exclude_ids?: number[];
}): Promise<CareProduct[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category) sp.set("category", params.category);
  if (params?.recommended) sp.set("recommended", "1");
  if (params?.order) sp.set("order", params.order);
  if (params?.exclude_mine) sp.set("exclude_mine", "1");
  if (params?.exclude_ids?.length) sp.set("exclude_ids", params.exclude_ids.join(","));
  const q = sp.toString();
  return apiJson(`/api/v1/ai/care/products/${q ? `?${q}` : ""}`);
}

export async function fetchCareProduct(id: number): Promise<CareProduct> {
  return apiJson(`/api/v1/ai/care/products/${id}/`);
}

export type SosTime = "2min" | "5-10min" | "15min+";
export type SosIssue = "frizzy" | "oily" | "bedhead" | "dry";
export type SosTool =
  | "dryer"
  | "dry_shampoo"
  | "water_spray"
  | "comb"
  | "wax_gel"
  | "nothing";

export type SosFix = {
  title: string;
  steps: string[];
  suggested_hairstyle: string;
  pro_tip: string;
  source?: "ai" | "fallback" | string;
};

export async function generateSosFix(body: {
  time_available: SosTime;
  hair_issue: SosIssue[];
  tools_available: SosTool[];
}): Promise<SosFix> {
  const data = await apiJson<{ fix?: SosFix }>("/api/v1/ai/care/sos/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!data?.fix) throw new Error("Tezkor yechim javobi noto'g'ri.");
  return data.fix;
}

export type CareShelfCategory = "hair" | "face" | "scalp" | "beard" | "other";
export type CareShelfStatus = "OK" | "REFILL_SOON" | "EXPIRED";

export type CareShelfItem = {
  id: number;
  product_id: number | null;
  image_url: string | null;
  name: string;
  brand: string;
  category: CareShelfCategory | string;
  volume_ml: number;
  usage_frequency: string;
  uses_per_day: number;
  dose_ml_per_use: number;
  opened_at: string;
  pao_months: 3 | 6 | 12 | 24 | number;
  pao_code: string;
  ai_advice: string;
  estimated_total_uses: number;
  days_to_depletion: number;
  estimated_days_left: number;
  refill_date: string;
  expiration_date: string;
  days_to_pao: number;
  remaining_percent: number;
  status_flag: CareShelfStatus;
  status_label: string;
  created_at: string | null;
  updated_at: string | null;
};

export type CareShelfSummary = {
  active: number;
  refill_soon: number;
  expired: number;
};

export type CareShelfEstimate = {
  estimated_total_uses: number;
  days_to_depletion: number;
  estimated_days_left: number;
  refill_date: string;
  expiration_date: string;
  days_to_pao: number;
  remaining_percent: number;
  status_flag: CareShelfStatus;
  uses_per_day: number;
  dose_ml_per_use: number;
  ai_advice: string;
};

export async function fetchCareShelf(): Promise<{ items: CareShelfItem[]; summary: CareShelfSummary }> {
  return apiJson("/api/v1/ai/care/shelf/");
}

export async function createCareShelfItem(body: {
  product_id?: number | null;
  name: string;
  brand?: string;
  category: CareShelfCategory;
  volume_ml: number;
  usage_frequency: string;
  opened_at: string;
  pao_months: 3 | 6 | 12 | 24;
  with_ai?: boolean;
}): Promise<{ item: CareShelfItem; usage?: unknown }> {
  return apiJson("/api/v1/ai/care/shelf/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCareShelfItem(
  itemId: number,
  body: Partial<{
    product_id: number | null;
    name: string;
    brand: string;
    category: CareShelfCategory;
    volume_ml: number;
    usage_frequency: string;
    opened_at: string;
    pao_months: 3 | 6 | 12 | 24;
    with_ai: boolean;
  }>,
): Promise<{ item: CareShelfItem; usage?: unknown }> {
  return apiJson(`/api/v1/ai/care/shelf/${itemId}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCareShelfItem(itemId: number): Promise<void> {
  await apiJson(`/api/v1/ai/care/shelf/${itemId}/`, { method: "DELETE" });
}

export async function estimateCareShelf(body: {
  product_name: string;
  category: CareShelfCategory;
  volume_ml: number;
  usage_frequency: string;
  opened_at: string;
  pao_months: 3 | 6 | 12 | 24;
  dose_ml_per_use?: number;
}): Promise<{ estimate: CareShelfEstimate; usage?: unknown }> {
  return apiJson("/api/v1/ai/care/shelf/estimate/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type WeatherCareSnapshot = {
  location_label?: string;
  location_place?: string;
  location_region?: string;
  region_id?: string;
  latitude?: number;
  longitude?: number;
  summary?: string;
  recommendations?: string[];
  current?: {
    temperature_c?: number | null;
    humidity_pct?: number | null;
    wind_kmh?: number | null;
    condition_key?: string;
    uv_index?: number | null;
  };
  uv?: { index?: number | null; level?: string; tip?: string };
  primary_action?: { title?: string; subtitle?: string };
  product_plan?: Array<{
    name?: string;
    brand?: string;
    tip?: string;
    how_to_use?: string;
    image_url?: string | null;
  }>;
};

export async function fetchWeatherCare(params?: {
  condition?: string;
  texture?: string;
  lat?: number;
  lon?: number;
  region_id?: string;
}): Promise<WeatherCareSnapshot> {
  const sp = new URLSearchParams();
  if (params?.condition) sp.set("condition", params.condition);
  if (params?.texture) sp.set("texture", params.texture);
  if (params?.lat != null) sp.set("lat", String(params.lat));
  if (params?.lon != null) sp.set("lon", String(params.lon));
  if (params?.region_id) sp.set("region_id", params.region_id);
  const q = sp.toString();
  return apiJson(`/api/v1/ai/care/weather/${q ? `?${q}` : ""}`);
}

export type WeatherShieldRec = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: number;
  icon?: string;
  productTag?: string;
  image_url?: string;
};

export type WeatherShieldAlert = {
  id: string;
  label: string;
  severity: string;
};

export async function fetchWeatherShieldCatalog(params: {
  temp?: number | null;
  humidity?: number | null;
  uv?: number | null;
  wind?: number | null;
  condition?: string;
  hair_condition?: string;
}): Promise<{
  alerts: WeatherShieldAlert[];
  recommendations: WeatherShieldRec[];
  done_ids: string[];
}> {
  const sp = new URLSearchParams();
  if (params.temp != null) sp.set("temp", String(params.temp));
  if (params.humidity != null) sp.set("humidity", String(params.humidity));
  if (params.uv != null) sp.set("uv", String(params.uv));
  if (params.wind != null) sp.set("wind", String(params.wind));
  if (params.condition) sp.set("condition", params.condition);
  if (params.hair_condition) sp.set("hair_condition", params.hair_condition);
  const q = sp.toString();
  const body = await apiJson<{
    alerts?: WeatherShieldAlert[];
    recommendations?: WeatherShieldRec[];
    done_ids?: string[];
  }>(`/api/v1/ai/care/weather-shield/${q ? `?${q}` : ""}`);
  return {
    alerts: body.alerts || [],
    recommendations: body.recommendations || [],
    done_ids: body.done_ids || [],
  };
}

export async function postWeatherShieldAction(body: {
  id: string;
  completed: boolean;
  weather_snapshot?: Record<string, unknown>;
}): Promise<void> {
  await apiJson("/api/v1/ai/care/weather-shield/actions/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchCareProductByBarcode(
  barcode: string,
  profile?: { condition?: string; texture?: string; color_status?: string; scalp?: string },
) {
  const sp = new URLSearchParams();
  if (profile?.condition) sp.set("condition", profile.condition);
  if (profile?.texture) sp.set("texture", profile.texture);
  if (profile?.color_status) sp.set("color_status", profile.color_status);
  if (profile?.scalp) sp.set("scalp", profile.scalp);
  const q = sp.toString();
  return apiJson(
    `/api/v1/products/barcode/${encodeURIComponent(barcode)}/${q ? `?${q}` : ""}`,
  );
}

export type AiCarePlanTask = {
  id: string;
  title: string;
  subtitle: string;
  time_hint?: string;
  time?: string;
  duration_min?: number | null;
  icon: string;
  product_id?: number | null;
  product_name?: string;
};

export type AiCarePlan = {
  summary: string;
  morning: AiCarePlanTask[];
  evening: AiCarePlanTask[];
  weekly: AiCarePlanTask[];
  weekly_schedule: {
    day: string;
    task: string;
    time?: string;
    product_id?: number | null;
    product_name?: string;
  }[];
  tips: string[];
  avoid: string[];
};

export async function fetchSavedCarePlan(params: {
  productIds: number[];
  profileKey: string;
}): Promise<{ plan: AiCarePlan | null; stale: boolean }> {
  const q = new URLSearchParams({
    product_ids: params.productIds.join(","),
    profile_key: params.profileKey,
  });
  return apiJson(`/api/v1/ai/care/plan/?${q.toString()}`);
}

export async function generateCarePlan(body: {
  condition: string;
  texture: string;
  color_status: string;
  products: { id: number; name: string; brand?: string; category?: string }[];
  mode?: "full" | "append";
  morning_time?: string;
  evening_time?: string;
}): Promise<AiCarePlan> {
  const data = await apiJson<{ plan?: AiCarePlan; ready?: boolean; detail?: string }>(
    "/api/v1/ai/care/plan/",
    { method: "POST", body: JSON.stringify(body) },
  );
  if (data?.ready === false || !data?.plan) {
    throw new Error(data?.detail || "Parvarish reja yaratilmadi.");
  }
  return data.plan;
}

export type MyCareProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  source: string;
  added_at: string | null;
  usage_uz?: string;
  purpose_uz?: string;
};

export async function fetchMyCareProducts(): Promise<MyCareProduct[]> {
  return apiJson("/api/v1/ai/care/my-products/");
}

export async function addMyCareProduct(body: {
  product_id: number;
  source?: string;
}): Promise<MyCareProduct> {
  return apiJson("/api/v1/ai/care/my-products/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function toggleCareProductLike(
  productId: number,
): Promise<{ liked: boolean; likes_count: number; product_id: number }> {
  return apiJson(`/api/v1/ai/care/products/${productId}/like/`, {
    method: "POST",
    body: "{}",
  });
}

export type HairGrowthForecast = {
  projected_length_3_months: number;
  monthly_growth_cm?: number;
  growth_rate_status: string;
  ai_commentary: string;
  recommended_action: string;
};

export async function generateHairGrowthForecast(body: {
  current_length_cm: number;
  check_ins_count: number;
  products_used: string[];
}): Promise<HairGrowthForecast> {
  const data = await apiJson<{ forecast?: HairGrowthForecast; detail?: string }>(
    "/api/v1/ai/care/growth-forecast/",
    { method: "POST", body: JSON.stringify(body) },
  );
  if (!data?.forecast) throw new Error(data?.detail || "O‘sish prognozi yaratilmadi.");
  return data.forecast;
}
