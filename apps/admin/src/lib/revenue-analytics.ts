import { apiJson } from "@/lib/api";

export const ANALYTICS_PRESETS = [
  ["today", "Bugun"],
  ["yesterday", "Kecha"],
  ["days_ago_3", "3 kun oldin"],
  ["days_ago_7", "7 kun oldin"],
  ["last_7_days", "So'nggi 7 kun"],
  ["last_30_days", "So'nggi 30 kun"],
  ["last_90_days", "So'nggi 90 kun"],
  ["custom", "Oraliq"],
] as const;

export type AnalyticsPreset = (typeof ANALYTICS_PRESETS)[number][0];

export type AnalyticsKpi = {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  absolute?: number | null;
  change_percent: number | null;
  change_state: "defined" | "undefined" | "unavailable";
  direction?: "up" | "down" | "flat";
  series?: { date: string; value: number }[];
  available?: boolean;
  unit?: string;
};

export type AnalyticsPeriod = {
  key: string;
  label: string;
  previous_label: string;
  comparison: string;
  start?: string;
  end?: string;
  previous_start?: string;
  previous_end?: string;
};

export function analyticsQuery(
  preset: string,
  start = "",
  end = "",
  extra: Record<string, string> = {},
) {
  const params = new URLSearchParams({ preset, ...extra });
  if (preset === "custom") {
    if (start) params.set("start", start);
    if (end) params.set("end", end);
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function fetchAnalyticsOverview(query: string) {
  return apiJson<OverviewResponse>(`/api/v1/admin/analytics/overview/${query}`);
}

export function fetchAnalyticsVisitors(query: string) {
  return apiJson<VisitorsResponse>(`/api/v1/admin/analytics/visitors/${query}`);
}

export function fetchAnalyticsFunnel(query: string) {
  return apiJson<FunnelResponse>(`/api/v1/admin/analytics/funnel/${query}`);
}

export function fetchAnalyticsStage(query: string) {
  return apiJson<StageResponse>(`/api/v1/admin/analytics/funnel/stage/${query}`);
}

export function fetchAnalyticsPayments(query: string) {
  return apiJson<PaymentsResponse>(`/api/v1/admin/analytics/payments/${query}`);
}

export function fetchAnalyticsRevenue(query: string) {
  return apiJson<RevenueResponse>(`/api/v1/admin/analytics/revenue/${query}`);
}

export function fetchAnalyticsAi(query: string) {
  return apiJson<AiResponse>(`/api/v1/admin/analytics/ai/${query}`);
}

export function fetchAnalyticsSources(query: string) {
  return apiJson<SourcesResponse>(`/api/v1/admin/analytics/sources/${query}`);
}

export function fetchAnalyticsRealtime() {
  return apiJson<RealtimeResponse>("/api/v1/admin/analytics/realtime/");
}

export function fetchAnalyticsUsers(query: string) {
  return apiJson<UsersResponse>(`/api/v1/admin/analytics/users/${query}`);
}

export function fetchAnalyticsJourney(id: string, page: number) {
  return apiJson<JourneyResponse>(
    `/api/v1/admin/analytics/users/${encodeURIComponent(id)}/journey/?page=${page}`,
  );
}

export type OverviewResponse = {
  period: AnalyticsPeriod;
  questions: { id: string; label: string; value: unknown; available?: boolean; note?: string }[];
  kpis: AnalyticsKpi[];
  diagnostics: { id: string; message: string; sample_size: number }[];
  limitations: string[];
  tracking_since: string | null;
  visitors?: {
    unique_visitors: number;
    registered_users: number;
    registration_conversion: number | null;
    new_visitors?: number;
    returning_visitors?: number;
    page_views?: number;
    sessions?: number | null;
    bounce_rate?: number | null;
    engagement_rate?: number | null;
  };
  payments?: {
    attempts: number;
    successful: number;
    failed: number;
    cancelled: number;
    pending: number;
    abandoned: number;
    expired: number;
    success_rate: number | null;
    confirmed_revenue_uzs: number;
    redirect_attempted: number;
  };
  traffic_days: {
    today: number;
    yesterday: number;
    days_ago_3: number;
    days_ago_7: number;
    days_ago_30: number;
    change: AnalyticsKpi;
  };
};

export type VisitorsResponse = {
  period: AnalyticsPeriod;
  kpis: AnalyticsKpi[];
  limitations: string[];
  total_basis: string;
};

export type FunnelStage = {
  key: string;
  label: string;
  unique_users: number;
  unique_sessions: number;
  events: number;
  standalone_users: number;
  conversion_from_previous: number | null;
  conversion_from_start: number | null;
  drop_off: number | null;
  drop_off_percent: number | null;
  avg_seconds_to_next: number | null;
  tracking: string;
};

export type FunnelResponse = {
  mode: string;
  window_days: number;
  stages: FunnelStage[];
  limitations: string[];
  tracking_since: string | null;
  period?: AnalyticsPeriod;
};

export type StageResponse = {
  stage: FunnelStage;
  count: number;
  page: number;
  results: { id: string; label: string }[];
};

export type PaymentsResponse = {
  period?: AnalyticsPeriod;
  kpis: AnalyticsKpi[];
  rates: {
    success_rate: number | null;
    checkout_to_payment_rate: number | null;
    average_amount_uzs: number | null;
    redirect_attempted: number;
  };
  note: string;
  limitations: string[];
};

export type RevenueResponse = {
  confirmed_revenue_uzs: number;
  premium_revenue_uzs: number;
  new_paying_customers: number;
  returning_paying_customers: number;
  active_paid_subscriptions: number;
  expired_subscriptions: number;
  cancelled_subscriptions: number;
  refunded_uzs: number;
  net_revenue_uzs: number;
  arppu_uzs: number | null;
  arpu_uzs: number | null;
  mrr: null;
  mrr_available: boolean;
  mrr_reason: string;
  active_entitlement_value_uzs: number;
  revenue_conversion: number | null;
  limitations: string[];
};

export type AiResponse = {
  tryon_page_views: number | null;
  tryon_page_views_available: boolean;
  styles_selected: number | null;
  generation_requests: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
  recorded_cost_usd: string | null;
  estimated_cost_usd: string | null;
  free_generations: number;
  premium_generations: number;
  engagement_rate: number | null;
  ai_to_premium_rate: number | null;
  cost_per_active_user_usd: string | null;
  cost_per_paying_user_usd: string | null;
  error_categories: { category: string; count: number }[];
  limitations: string[];
};

export type SourcesResponse = {
  rows: {
    source: string;
    visitors: number;
    registrations: number;
    premium_views: number;
    payment_attempts: number;
    purchases: number;
    conversion: number | null;
    revenue_uzs: number;
  }[];
  ad_cost_available: boolean;
  ad_cost_uzs: number | null;
  roas: null;
  cpa: null;
  cac: null;
  limitations: string[];
};

export type RealtimeResponse = {
  active_5_minutes: number;
  active_15_minutes: number;
  active_sessions: number;
  note: string;
  recent_registrations: { name: string; at: string }[];
  recent_premium_views: { name: string; at: string }[];
  recent_subscribe_clicks: { name: string; at: string }[];
  recent_payment_attempts: { name: string; at: string; status?: string }[];
  recent_confirmed_payments: { name: string; at: string; amount_uzs?: number }[];
  recent_ai: { name: string; at: string }[];
};

export type UsersResponse = {
  count: number;
  page: number;
  results: {
    id: string;
    label: string;
    registered: boolean;
    auth_method: string;
    source: string;
    device: string;
    first_seen: string | null;
    last_seen: string | null;
    visits: number;
  }[];
};

export type JourneyResponse = {
  id: string;
  label: string;
  first_visit: string | null;
  last_visit: string | null;
  visits: number;
  sessions: number;
  registered_at: string | null;
  auth_method: string;
  source: string;
  device: string;
  ai_generations: number;
  premium_page_views: number;
  subscribe_clicks: number;
  payment_attempts: number;
  successful_payments: number;
  subscription: {
    status: string;
    plan_code: string;
    ends_at: string | null;
    price_uzs: number;
  } | null;
  confirmed_spend_uzs: number;
  count: number;
  page: number;
  events: {
    name: string;
    at: string;
    page: string;
    status: string;
    session: string;
    properties: Record<string, unknown>;
    payment_id?: string | null;
  }[];
};
