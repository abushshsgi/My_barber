"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Users, DollarSign, Scissors, Loader2, Bell } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import type { SalonListApi } from "@/lib/mapSalon";
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

  const { data: mineSalons = [], isLoading: loadingSalons } = useQuery({
    queryKey: ["salons", "mine"],
    queryFn: fetchMineSalons,
  });

  const firstSalonId = mineSalons[0]?.id ?? null;
  const activeSalon = salonId ?? firstSalonId;

  const range = useMemo(() => weekStartEnd(), []);

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["analytics", activeSalon, range.start.toISOString(), range.end.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        salon: String(activeSalon),
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      });
      const res = await apiFetch(`/api/v1/analytics/?${params}`);
      if (!res.ok) throw new Error("Analitika yuklanmadi");
      return res.json() as Promise<AnalyticsResponse>;
    },
    enabled: !!activeSalon,
  });

  const chartData = useMemo(() => {
    const daily = analytics?.daily ?? [];
    return daily.map((d) => ({
      name: d.date ? d.date.slice(5) : "—",
      revenue: parseFloat(d.revenue) || 0,
    }));
  }, [analytics]);

  const topServices = analytics?.top_services ?? [];

  if (loadingSalons) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!mineSalons.length) {
    return (
      <div className="min-h-screen px-4 pt-8">
        <p className="text-muted-foreground text-center">
          Hozircha salon yo&apos;q. Saloningizni yarating.
        </p>
      </div>
    );
  }

  const revenueNum = parseFloat(analytics?.revenue ?? "0") || 0;

  const stats = [
    {
      label: "Daromad (7 kun)",
      value: revenueNum.toLocaleString(),
      suffix: "so'm",
      icon: DollarSign,
    },
    {
      label: "Jami mijozlar",
      value: String(analytics?.unique_clients ?? "—"),
      icon: Users,
    },
    {
      label: "Mashhur xizmatlar (soni)",
      value: String(topServices[0]?.cnt ?? "—"),
      icon: Scissors,
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Haftalik ko&apos;rinish</p>
          </div>
          <Link
            href="/notifications"
            className="w-10 h-10 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Xabarnomalar"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>

        {mineSalons.length > 1 && (
          <select
            className="w-full mb-4 h-10 px-3 rounded-xl border bg-background text-sm"
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
        )}

        {loadingAnalytics && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}

        {!loadingAnalytics && analytics && (
          <>
            <div className="space-y-3 mb-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                      <stat.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-bold">
                        {stat.value} {stat.suffix || ""}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Yangi: {analytics.new_clients} · Qaytgan: {analytics.returning_clients}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Kunlik daromad</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.length ? chartData : [{ name: "—", revenue: 0 }]}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value) => [
                        `${Math.round(Number(value) || 0).toLocaleString()} so'm`,
                        "Daromad",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(172, 60%, 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4 mt-3">
              <h3 className="font-semibold text-sm mb-3">Mashhur xizmatlar</h3>
              <div className="space-y-2">
                {topServices.length === 0 && (
                  <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
                )}
                {topServices.map((s) => {
                  const max = topServices[0]?.cnt || 1;
                  const pct = Math.round((s.cnt / max) * 100);
                  return (
                    <div key={s.service_name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate pr-2">{s.service_name}</span>
                        <span className="font-medium">{s.cnt}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gold-gradient rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {!loadingAnalytics && !analytics && activeSalon && (
          <p className="text-sm text-destructive text-center">Analitika yuklanmadi</p>
        )}
      </div>
    </div>
  );
};

export default BarberDashboard;
