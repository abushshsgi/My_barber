import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminSalonAnalytics } from "@/lib/admin-api";
import {
  buildAdminDailyRows,
  buildDailyBarChart,
  type StatsDailyRow,
  type StatsRangeKey,
  statsRangeToIsoParams,
} from "@/lib/admin-analytics";

type RollupRow = {
  key: string;
  label: string;
  revenue: number;
  cash: number;
  online: number;
  bookings: number;
  clients: number;
};

function weekStartKey(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function rollupDailyRows(rows: StatsDailyRow[], mode: "week" | "month"): RollupRow[] {
  const buckets = new Map<string, RollupRow>();
  for (const row of rows) {
    const key = mode === "month" ? row.date.slice(0, 7) : weekStartKey(row.date);
    const label = mode === "month" ? key : key.slice(5);
    const bucket = buckets.get(key) ?? {
      key,
      label,
      revenue: 0,
      cash: 0,
      online: 0,
      bookings: 0,
      clients: 0,
    };
    bucket.revenue += row.revenue;
    bucket.cash += row.cash;
    bucket.online += row.online;
    bucket.bookings += row.bookings;
    bucket.clients += row.clients;
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function useAdminSalonStatsMetrics(salonId: string, range: StatsRangeKey) {
  const dates = useMemo(() => statsRangeToIsoParams(range), [range]);
  const { data: analytics, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin", "salon", salonId, "analytics", dates.start, dates.end],
    queryFn: () => fetchAdminSalonAnalytics(salonId, dates),
    staleTime: 20_000,
  });

  const dailyRows = useMemo(
    () => buildAdminDailyRows(analytics?.daily ?? [], range),
    [analytics?.daily, range],
  );

  const dailyChart = useMemo(
    () =>
      buildDailyBarChart(
        dailyRows.map((row) => ({
          date: row.date,
          revenue: row.revenue,
          bookings: row.bookings,
        })),
      ),
    [dailyRows],
  );

  const totalRevenue = Number(analytics?.revenue) || 0;
  const cashTotal = Number(analytics?.cash_total) || 0;
  const onlineTotal = Number(analytics?.online_total) || 0;
  const completedCount = analytics?.completed_count ?? 0;
  const cancelledCount = analytics?.cancelled_count ?? 0;
  const completionRate =
    completedCount + cancelledCount > 0
      ? (completedCount / Math.max(1, completedCount + cancelledCount)) * 100
      : 0;
  const avgTicket = totalRevenue > 0 ? totalRevenue / Math.max(1, completedCount) : 0;
  const repeatRate = analytics?.unique_clients
    ? ((analytics.returning_clients ?? 0) / Math.max(1, analytics.unique_clients)) * 100
    : 0;

  const topServices =
    analytics?.top_services?.map((s) => ({ name: s.service_name, count: s.cnt })) ?? [];

  const weeklyRows = useMemo(() => {
    if (analytics?.weekly?.length) {
      return analytics.weekly.map((row) => ({
        key: row.week,
        label: row.week.slice(5),
        revenue: Number(row.revenue) || 0,
        cash: Number(row.cash_revenue) || 0,
        online: Number(row.online_revenue) || 0,
        bookings: row.bookings ?? 0,
        clients: row.clients ?? 0,
      }));
    }
    return rollupDailyRows(dailyRows, "week");
  }, [analytics?.weekly, dailyRows]);

  const monthlyRows = useMemo(() => {
    if (analytics?.monthly?.length) {
      return analytics.monthly.map((row) => ({
        key: row.month,
        label: row.month,
        revenue: Number(row.revenue) || 0,
        cash: Number(row.cash_revenue) || 0,
        online: Number(row.online_revenue) || 0,
        bookings: row.bookings ?? 0,
        clients: row.clients ?? 0,
      }));
    }
    return rollupDailyRows(dailyRows, "month");
  }, [analytics?.monthly, dailyRows]);

  return {
    analytics,
    dailyRows,
    dailyChart,
    weeklyRows,
    monthlyRows,
    totalRevenue,
    cashTotal,
    onlineTotal,
    cashCount: analytics?.cash_count ?? 0,
    onlineCount: analytics?.online_count ?? 0,
    completedCount,
    cancelledCount,
    completionRate,
    avgTicket,
    repeatRate,
    topServices,
    isLoading,
    isError,
    isFetching,
  };
}

export type AdminSalonStatsMetrics = ReturnType<typeof useAdminSalonStatsMetrics>;
