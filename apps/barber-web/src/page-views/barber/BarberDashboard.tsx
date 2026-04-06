"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Users, DollarSign, Scissors, Loader2, TrendingUp } from "lucide-react";
import { fetchBarberMe } from "@/data/barber-me";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import type { SalonListApi } from "@/lib/mapSalon";
import { SalonOnboarding } from "@/page-views/barber/SalonEntryChoice";
import { subDays, startOfDay, endOfDay } from "date-fns";

type AnalyticsResponse = {
  revenue: string;
  unique_clients: number;
  new_clients: number;
  returning_clients: number;
  top_services: { service_name: string; cnt: number }[];
  daily: { date: string; revenue: string }[];
};

async function fetchMineSalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) throw new Error("Salonlar yuklanmadi");
  return res.json() as Promise<SalonListApi[]>;
}

function weekStartEnd() {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(end, 6));
  return { start, end };
}

const BarberDashboard = () => {
  const [salonId, setSalonId] = useState<number | null>(null);

  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ["barber", "auth", "me"],
    queryFn: fetchBarberMe,
    staleTime: 60_000,
  });
  const isIndependent = me?.work_mode === "independent";

  const { data: mineSalons = [], isLoading: loadingSalons } = useQuery({
    queryKey: ["salons", "mine"],
    queryFn: fetchMineSalons,
    enabled: me != null && !isIndependent,
  });

  const firstSalonId = mineSalons[0]?.id ?? null;
  const activeSalon = salonId ?? firstSalonId;
  const activeSalonName = mineSalons.find((s) => s.id === activeSalon)?.name;

  const range = useMemo(() => weekStartEnd(), []);

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: [
      "analytics",
      isIndependent ? "independent" : activeSalon,
      range.start.toISOString(),
      range.end.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      if (isIndependent) {
        params.set("independent", "1");
      } else {
        params.set("salon", String(activeSalon));
      }
      const res = await apiFetch(`/api/v1/analytics/?${params}`);
      if (!res.ok) throw new Error("Analitika yuklanmadi");
      return res.json() as Promise<AnalyticsResponse>;
    },
    enabled: isIndependent || !!activeSalon,
  });

  const chartData = useMemo(() => {
    const daily = analytics?.daily ?? [];
    return daily.map((d) => ({
      name: d.date ? d.date.slice(5) : "—",
      revenue: parseFloat(d.revenue) || 0,
    }));
  }, [analytics]);

  const topServices = analytics?.top_services ?? [];

  if (loadingMe) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  if (!isIndependent && loadingSalons) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  } else if (!mineSalons.length) {
    return (
      <div className="mx-auto max-w-lg pb-24 pt-2 md:max-w-xl md:pt-6">
        <SalonOnboarding
          className="min-h-0"
          intro="Statistika salon ulangandan keyin shu yerda ko‘rinadi. Quyidagi yo‘llardan birini tanlang."
        />
      </div>
    );
  }

  const revenueNum = parseFloat(analytics?.revenue ?? "0") || 0;

  const dashboardTitle = isIndependent ? "Mustaqil barber" : "Haftalik ko'rinish";
  const revenueLabel = isIndependent
    ? "Mustaqil bronlar — daromad (7 kun)"
    : activeSalonName
      ? `«${activeSalonName}» — daromad (7 kun)`
      : "Salon — daromad (7 kun)";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-5 md:pt-10">
      <div className="mb-6 hidden md:block">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Statistika
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{dashboardTitle}</h2>
      </div>

      {!isIndependent && mineSalons.length > 1 && (
        <label className="mb-5 block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Salon
          </span>
          <select
            className="h-11 w-full max-w-md rounded-2xl border border-border/60 bg-card/50 px-4 text-sm backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={activeSalon ?? ""}
            onChange={(e) => setSalonId(Number(e.target.value))}
          >
            {mineSalons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_published === false ? " — yashirin" : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      {loadingAnalytics && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
        </div>
      )}

      {!loadingAnalytics && analytics && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 via-card/90 to-card p-6 shadow-[0_24px_64px_-24px_hsl(var(--primary)/0.35)] md:p-8"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-medium text-muted-foreground">{revenueLabel}</p>
              <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {revenueNum.toLocaleString()}{" "}
                <span className="text-lg font-semibold text-muted-foreground md:text-xl">
                  so&apos;m
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/50 px-3 py-1 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  Yangi: {analytics.new_clients}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/50 px-3 py-1 text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Qaytgan: {analytics.returning_clients}
                </span>
              </div>
            </div>
          </motion.div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Card className="h-full border-border/50 bg-card/60 p-5 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Jami mijozlar
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">
                      {analytics.unique_clients}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="h-full border-border/50 bg-card/60 p-5 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Top xizmat
                    </p>
                    <p className="mt-2 truncate text-lg font-semibold">
                      {topServices[0]?.service_name ?? "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {topServices[0]?.cnt != null ? `${topServices[0].cnt} marta` : "Ma'lumot yo'q"}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Scissors className="h-6 w-6" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-5"
          >
            <Card className="border-border/50 bg-card/40 p-5 backdrop-blur-sm md:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Kunlik oqim</h3>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="h-52 w-full md:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData.length ? chartData : [{ name: "—", revenue: 0 }]}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      formatter={(value) => [
                        `${Math.round(Number(value) || 0).toLocaleString()} so'm`,
                        "Daromad",
                      ]}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: 13,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#revFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5"
          >
            <Card className="border-border/50 bg-card/40 p-5 backdrop-blur-sm md:p-6">
              <h3 className="mb-4 text-sm font-semibold">Mashhur xizmatlar</h3>
              <div className="space-y-4">
                {topServices.length === 0 && (
                  <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
                )}
                {topServices.map((s) => {
                  const max = topServices[0]?.cnt || 1;
                  const pct = Math.round((s.cnt / max) * 100);
                  return (
                    <div key={s.service_name}>
                      <div className="mb-1.5 flex justify-between gap-2 text-sm">
                        <span className="truncate text-muted-foreground">{s.service_name}</span>
                        <span className="shrink-0 font-medium tabular-nums">{s.cnt}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted/80">
                        <div
                          className="gold-gradient h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </>
      )}

      {!loadingAnalytics && !analytics && activeSalon && (
        <p className="py-8 text-center text-sm text-destructive">Analitika yuklanmadi</p>
      )}
    </div>
  );
};

export default BarberDashboard;
