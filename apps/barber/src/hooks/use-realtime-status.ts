import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { getBarberWsState, subscribeBarberWsState } from "@/hooks/use-booking-live-sync";

export type HealthRedisPayload = {
  configured: boolean;
  ping: boolean;
  channel_layer: string;
  cache: string;
  realtime_ready?: boolean;
  error?: string;
};

export type HealthResponse = {
  ok: boolean;
  redis: HealthRedisPayload;
  realtime: { ready: boolean; mode: "redis" | "polling" };
};

async function fetchHealth(): Promise<HealthResponse> {
  const base = API_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  const res = await fetch(`${base}/health/`, { credentials: "omit" });
  if (!res.ok) throw new Error("Health tekshiruvi muvaffaqiyatsiz");
  return res.json() as Promise<HealthResponse>;
}

export type RealtimeUiStatus =
  | "live"
  | "redis_only"
  | "polling"
  | "redis_error"
  | "checking";

export function resolveRealtimeUiStatus(
  health: HealthResponse | undefined,
  wsOpen: boolean,
  isLoading: boolean,
): RealtimeUiStatus {
  if (isLoading && !health) return "checking";
  const redis = health?.redis;
  if (!redis?.configured) return "polling";
  if (!redis.ping) return "redis_error";
  if (health?.realtime?.ready && wsOpen) return "live";
  if (redis.ping) return "redis_only";
  return "polling";
}

export function useRealtimeStatus(enabled = true) {
  const [wsOpen, setWsOpen] = useState(getBarberWsState() === "open");

  useEffect(() => subscribeBarberWsState(setWsOpen), []);

  const healthQ = useQuery({
    queryKey: ["realtime", "health"],
    queryFn: fetchHealth,
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });

  const status = resolveRealtimeUiStatus(healthQ.data, wsOpen, healthQ.isLoading);

  return {
    status,
    health: healthQ.data,
    wsOpen,
    isLoading: healthQ.isLoading,
    refetch: healthQ.refetch,
  };
}
