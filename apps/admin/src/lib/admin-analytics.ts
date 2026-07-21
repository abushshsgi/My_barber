export type StatsRangeKey = "7d" | "30d" | "90d";

export type AdminAnalyticsDaily = {
  date: string;
  revenue: string | number;
  cash_revenue?: string | number;
  online_revenue?: string | number;
  bookings?: number;
  clients?: number;
};

export type AdminAnalyticsResponse = {
  revenue: string;
  cash_total?: string;
  online_total?: string;
  cash_count?: number;
  online_count?: number;
  unique_clients: number;
  new_clients: number;
  returning_clients: number;
  top_services: Array<{ service_name: string; cnt: number }>;
  daily: AdminAnalyticsDaily[];
  weekly?: Array<{
    week: string;
    revenue: string;
    cash_revenue?: string;
    online_revenue?: string;
    bookings: number;
    clients: number;
  }>;
  monthly?: Array<{
    month: string;
    revenue: string;
    cash_revenue?: string;
    online_revenue?: string;
    bookings: number;
    clients: number;
  }>;
  cancelled_count?: number;
  completed_count?: number;
};

export type StatsDailyRow = {
  date: string;
  revenue: number;
  cash: number;
  online: number;
  bookings: number;
  clients: number;
};

export type DailyChartItem = {
  date: string;
  label: string;
  amount: number;
  bookings: number;
  heightPct: number;
};

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function statsRangeToIsoParams(key: StatsRangeKey, now = new Date()): { start: string; end: string } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  const daysBack = key === "7d" ? 6 : key === "30d" ? 29 : 89;
  start.setDate(start.getDate() - daysBack);
  return { start: formatYmd(start), end: formatYmd(end) };
}

export function buildAdminDailyRows(
  apiDaily: AdminAnalyticsDaily[] = [],
  range: StatsRangeKey,
  now = new Date(),
): StatsDailyRow[] {
  const byDate = new Map<string, StatsDailyRow>();
  for (const row of apiDaily) {
    const key = row.date.slice(0, 10);
    byDate.set(key, {
      date: key,
      revenue: Number(row.revenue) || 0,
      cash: Number(row.cash_revenue) || 0,
      online: Number(row.online_revenue) || 0,
      bookings: Number(row.bookings) || 0,
      clients: Number(row.clients) || 0,
    });
  }

  const { start, end } = statsRangeToIsoParams(range, now);
  const cursor = parseYmd(start);
  const endDt = parseYmd(end);
  const out: StatsDailyRow[] = [];

  while (cursor <= endDt) {
    const key = formatYmd(cursor);
    out.push(
      byDate.get(key) ?? {
        date: key,
        revenue: 0,
        cash: 0,
        online: 0,
        bookings: 0,
        clients: 0,
      },
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return out;
}

function formatChartDayLabel(date: string, dense: boolean): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date.slice(5);
  if (dense) {
    return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
  }
  return d.toLocaleDateString("uz-UZ", { weekday: "short", day: "2-digit" });
}

export function buildDailyBarChart(
  rows: Array<{ date: string; revenue: string | number; bookings?: number }>,
): { items: DailyChartItem[]; hasData: boolean; tickInterval: number } {
  const dense = rows.length > 14;
  const items = rows.map((row) => {
    const date = row.date.slice(0, 10);
    const amount = Number(row.revenue) || 0;
    return {
      date,
      label: formatChartDayLabel(date, dense),
      amount,
      bookings: Number(row.bookings) || 0,
      heightPct: 0,
    };
  });
  const max = Math.max(1, ...items.map((i) => i.amount));
  const withHeights = items.map((i) => ({
    ...i,
    heightPct: i.amount > 0 ? Math.round((i.amount / max) * 100) : 0,
  }));
  return {
    items: withHeights,
    hasData: withHeights.some((i) => i.amount > 0),
    tickInterval: dense ? Math.max(1, Math.floor(withHeights.length / 7)) : 0,
  };
}

export function formatAdminUzs(amount: number): string {
  if (!Number.isFinite(amount)) return "0 so'm";
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M so'm`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K so'm`;
  return `${Math.round(amount).toLocaleString("uz-UZ")} so'm`;
}

/** Katta hero uchun to'liq summa (K/M qisqartmasiz). */
export function formatAdminUzsFull(amount: number): string {
  if (!Number.isFinite(amount)) return "0 so'm";
  return `${Math.round(amount).toLocaleString("uz-UZ")} so'm`;
}
