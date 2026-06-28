import { useMemo } from "react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { useBarberAnalyticsQuery } from "@/hooks/use-barber-queries";
import { resolveBarberAnalyticsParams } from "@/lib/analytics-scope";
import {
  buildDailyBarChart,
  buildStatsDailyRows,
  filterCompletedBookingsByStatsRange,
  isDateInStatsRange,
  statsRangeToIsoParams,
  type StatsDailyRow,
  type StatsRangeKey,
} from "@/lib/finance-range";

function pickMetric(apiVal: number | null | undefined, localVal: number): number {
  if (apiVal != null && apiVal > 0) return apiVal;
  return localVal;
}

export function useBarberStatsMetrics(range: StatsRangeKey) {
  const { bookings, clients, reviews, fullyReady } = useBarberContext();
  const dates = useMemo(() => statsRangeToIsoParams(range), [range]);
  const analyticsScope = useMemo(() => resolveBarberAnalyticsParams(), []);
  const { data: analytics, isLoading, isError, isFetching } = useBarberAnalyticsQuery(
    {
      start: dates.start,
      end: dates.end,
      barberMe: analyticsScope.barberMe,
    },
    fullyReady,
  );

  const completedInRange = useMemo(
    () => filterCompletedBookingsByStatsRange(bookings, range),
    [bookings, range],
  );

  const cancelledInRange = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === "cancelled" && b.start_at && isDateInStatsRange(b.start_at, range),
      ).length,
    [bookings, range],
  );

  const dailyRows = useMemo(
    () => buildStatsDailyRows(analytics?.daily ?? [], completedInRange, range),
    [analytics?.daily, completedInRange, range],
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

  const localCash = completedInRange
    .filter((b) => b.payment_method === "cash")
    .reduce((s, b) => s + b.price, 0);
  const localOnline = completedInRange
    .filter((b) => b.payment_method === "online")
    .reduce((s, b) => s + b.price, 0);
  const localRevenue = completedInRange.reduce((s, b) => s + b.price, 0);

  const totalRevenue = pickMetric(
    analytics?.revenue != null ? Number(analytics.revenue) : null,
    localRevenue,
  );
  const cashTotal = pickMetric(
    analytics?.cash_total != null ? Number(analytics.cash_total) : null,
    localCash,
  );
  const onlineTotal = pickMetric(
    analytics?.online_total != null ? Number(analytics.online_total) : null,
    localOnline,
  );

  const completedCount =
    analytics?.completed_count && analytics.completed_count > 0
      ? analytics.completed_count
      : completedInRange.length;

  const cancelledCount =
    analytics?.cancelled_count != null && analytics.cancelled_count > 0
      ? analytics.cancelled_count
      : cancelledInRange;

  const completionRate =
    completedCount + cancelledCount > 0
      ? (completedCount / Math.max(1, completedCount + cancelledCount)) * 100
      : 0;

  const avgTicket = totalRevenue > 0 ? totalRevenue / Math.max(1, completedCount) : 0;

  const repeatRate =
    analytics?.unique_clients
      ? ((analytics.returning_clients ?? 0) / Math.max(1, analytics.unique_clients)) * 100
      : clients.length > 0
        ? (clients.filter((c) => c.visits >= 2).length / clients.length) * 100
        : 0;

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length);

  const topServices = analytics?.top_services?.length
    ? analytics.top_services.map((s) => ({ name: s.service_name, count: s.cnt }))
    : Object.entries(
        completedInRange.reduce<Record<string, number>>((acc, b) => {
          acc[b.service] = (acc[b.service] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

  const cashCount =
    analytics?.cash_count && analytics.cash_count > 0
      ? analytics.cash_count
      : completedInRange.filter((b) => b.payment_method === "cash").length;
  const onlineCount =
    analytics?.online_count && analytics.online_count > 0
      ? analytics.online_count
      : completedInRange.filter((b) => b.payment_method === "online").length;

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
    completedInRange,
    totalRevenue,
    cashTotal,
    onlineTotal,
    cashCount,
    onlineCount,
    completedCount,
    cancelledCount,
    completionRate,
    avgTicket,
    repeatRate,
    avgRating,
    topServices,
    isLoading,
    isError,
    isFetching,
  };
}

type RollupRow = {
  key: string;
  label: string;
  revenue: number;
  cash: number;
  online: number;
  bookings: number;
  clients: number;
};

function rollupDailyRows(rows: StatsDailyRow[], mode: "week" | "month"): RollupRow[] {
  const buckets = new Map<string, RollupRow>();

  for (const row of rows) {
    const key =
      mode === "month"
        ? row.date.slice(0, 7)
        : weekStartKey(row.date);
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
