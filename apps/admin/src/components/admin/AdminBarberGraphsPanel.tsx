import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  PieChart as PieChartIcon,
  Scissors,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { EmptyState } from "@/components/admin/EmptyState";
import { KPICard } from "@/components/admin/KPICard";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { AdminBarberStatsMetrics } from "@/hooks/use-admin-barber-stats";

type Metrics = AdminBarberStatsMetrics;

const chartConfig = {
  revenue: { label: "Daromad", color: "hsl(var(--foreground))" },
  cash: { label: "Naqd", color: "hsl(142 55% 38%)" },
  online: { label: "Onlayn", color: "hsl(221 70% 50%)" },
  bookings: { label: "Bronlar", color: "hsl(var(--foreground))" },
  clients: { label: "Mijozlar", color: "hsl(262 55% 52%)" },
  count: { label: "Bronlar", color: "hsl(var(--foreground))" },
};

const PIE_COLORS = [
  "hsl(var(--foreground))",
  "hsl(142 55% 38%)",
  "hsl(221 70% 50%)",
  "hsl(262 55% 52%)",
];

const CHART_MARGIN = { top: 12, right: 12, left: 0, bottom: 4 };

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

function uzsTooltip(value: unknown) {
  return formatAdminUzs(Number(value) || 0);
}

function tickIntervalForLength(len: number) {
  return len > 14 ? Math.max(1, Math.floor(len / 7)) : 0;
}

function GraphChartCard({
  title,
  description,
  icon,
  children,
  className,
  bodyClassName,
  featured,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  featured?: boolean;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-card",
        featured && "ring-1 ring-foreground/5",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-3 border-b border-border px-5 py-4",
          featured && "bg-gradient-to-r from-muted/50 via-card to-card",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background shadow-sm">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

function PieLegend({ items }: { items: Array<{ name: string; value: number; color: string }> }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="truncate text-muted-foreground">{item.name}</span>
          </div>
          <div className="shrink-0 text-right">
            <span className="font-medium tabular-nums">{item.value}</span>
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DonutChartBlock({
  data,
  centerLabel,
  centerValue,
  formatValue,
}: {
  data: Array<{ name: string; value: number; key: string }>;
  centerLabel: string;
  centerValue: string;
  formatValue?: (v: number) => string;
}) {
  const hasData = data.some((d) => d.value > 0);
  const chartData = hasData ? data : [{ name: "Ma'lumot yo'q", value: 1, key: "empty" }];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative mx-auto w-full max-w-[220px] flex-1">
        <ChartContainer config={chartConfig} className="aspect-square h-[200px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v) => (formatValue ? formatValue(Number(v)) : String(v))}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={hasData ? 3 : 0}
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={entry.key}
                  fill={hasData ? PIE_COLORS[index % PIE_COLORS.length] : "hsl(var(--muted))"}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {centerLabel}
          </span>
          <span className="mt-0.5 max-w-[88px] truncate text-center text-sm font-semibold tabular-nums">
            {centerValue}
          </span>
        </div>
      </div>
      {hasData ? (
        <div className="w-full flex-1 sm:max-w-[180px]">
          <PieLegend
            items={data.map((item, index) => ({
              name: item.name,
              value: item.value,
              color: PIE_COLORS[index % PIE_COLORS.length],
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}

export function AdminBarberGraphsPanel({ metrics }: { metrics: Metrics }) {
  const {
    dailyRows,
    weeklyRows,
    monthlyRows,
    totalRevenue,
    cashTotal,
    onlineTotal,
    completedCount,
    cancelledCount,
    completionRate,
    repeatRate,
    topServices,
    analytics,
  } = metrics;

  const paymentMix = [
    { name: "Naqd", value: cashTotal, key: "cash" },
    { name: "Onlayn", value: onlineTotal, key: "online" },
  ].filter((row) => row.value > 0);

  const clientMix = [
    { name: "Yangi", value: analytics?.new_clients ?? 0, key: "new" },
    { name: "Qaytuvchi", value: analytics?.returning_clients ?? 0, key: "returning" },
  ].filter((row) => row.value > 0);

  const bookingOutcome = [
    { name: "Yakunlangan", value: completedCount, key: "done" },
    { name: "Bekor", value: cancelledCount, key: "cancelled" },
  ].filter((row) => row.value > 0);

  const serviceChart = topServices.slice(0, 6).map((s) => ({
    name: s.name.length > 22 ? `${s.name.slice(0, 20)}…` : s.name,
    count: s.count,
  }));

  const periodRows =
    dailyRows.length > 30
      ? monthlyRows
      : dailyRows.length > 14
        ? weeklyRows
        : dailyRows.map((row) => ({ ...row, label: row.date.slice(5), key: row.date }));
  const periodLabel = dailyRows.length > 30 ? "Oylik" : dailyRows.length > 14 ? "Haftalik" : "Kunlik";
  const tickInterval = tickIntervalForLength(dailyRows.length);

  const totalBookings = dailyRows.reduce((s, row) => s + row.bookings, 0);
  const activeDays = dailyRows.filter((row) => row.revenue > 0).length;
  const avgDaily = activeDays > 0 ? totalRevenue / activeDays : 0;
  const peakDay = dailyRows.reduce(
    (best, row) => (row.revenue > best.revenue ? row : best),
    dailyRows[0] ?? { date: "—", revenue: 0 },
  );

  if (!dailyRows.some((row) => row.revenue > 0)) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-5" />}
        title="Grafiklar hali tayyor emas"
        description="Tanlangan davrda yakunlangan bronlar bo'lgach, barcha diagrammalar shu yerda ko'rinadi."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPICard
          label="Jami daromad"
          value={formatAdminUzs(totalRevenue)}
          hint={`${activeDays} faol kun`}
          icon={Wallet}
        />
        <KPICard
          label="O'rtacha / kun"
          value={formatAdminUzs(avgDaily)}
          hint="Faol kunlar bo'yicha"
          icon={TrendingUp}
        />
        <KPICard
          label="Eng yaxshi kun"
          value={formatAdminUzs(peakDay.revenue)}
          hint={peakDay.date !== "—" ? peakDay.date.slice(5) : undefined}
          icon={CalendarDays}
        />
        <KPICard
          label="Jami bronlar"
          value={String(totalBookings)}
          hint={`${completionRate.toFixed(0)}% yakunlangan`}
          icon={Activity}
        />
      </div>

      <GraphChartCard
        featured
        title="Kunlik savdo dinamikasi"
        description="Tanlangan davrdagi daromad oqimi — hover qilib batafsil ko'ring"
        icon={<BarChart3 className="size-4" strokeWidth={2.2} />}
        bodyClassName="pt-2"
      >
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full sm:h-[300px]">
          <BarChart data={dailyRows} margin={CHART_MARGIN} barCategoryGap={dailyRows.length > 20 ? 4 : 12}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => String(v).slice(5)}
              tickLine={false}
              axisLine={false}
              interval={tickInterval}
              tickMargin={10}
              className="text-[10px]"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={formatAxisValue}
              className="text-[10px]"
            />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { date?: string; bookings?: number } | undefined;
                    const bookings = row?.bookings ? ` · ${row.bookings} bron` : "";
                    return `${row?.date ?? ""}${bookings}`;
                  }}
                  formatter={(v) => uzsTooltip(v)}
                />
              }
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      </GraphChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GraphChartCard
          title={`${periodLabel} trend`}
          description="Umumiy o'sish yoki pasayish"
          icon={<TrendingUp className="size-4" strokeWidth={2.2} />}
        >
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
            <LineChart data={periodRows} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} className="text-[10px]" />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={formatAxisValue}
                className="text-[10px]"
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => uzsTooltip(v)} />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-revenue)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </GraphChartCard>

        <GraphChartCard
          title="Naqd va onlayn"
          description="Kunlik to'lov turlari taqsimoti"
          icon={<CreditCard className="size-4" strokeWidth={2.2} />}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-600" />
              Naqd {formatAdminUzs(cashTotal)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
              <span className="size-2 rounded-full bg-blue-600" />
              Onlayn {formatAdminUzs(onlineTotal)}
            </span>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
            <BarChart data={dailyRows} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => String(v).slice(5)}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
                tickMargin={10}
                className="text-[10px]"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={formatAxisValue}
                className="text-[10px]"
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => uzsTooltip(v)} />} />
              <Bar dataKey="cash" stackId="pay" fill="var(--color-cash)" radius={[0, 0, 0, 0]} maxBarSize={32} />
              <Bar dataKey="online" stackId="pay" fill="var(--color-online)" radius={[8, 8, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ChartContainer>
        </GraphChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <GraphChartCard
          title="Bronlar va mijozlar"
          description="Kunlik faollik dinamikasi"
          icon={<Users className="size-4" strokeWidth={2.2} />}
        >
          <div className="mb-3 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-foreground" />
              Bronlar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-500" />
              Mijozlar
            </span>
          </div>
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
            <LineChart data={dailyRows} margin={CHART_MARGIN}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => String(v).slice(5)}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
                tickMargin={10}
                className="text-[10px]"
              />
              <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} className="text-[10px]" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="var(--color-bookings)"
                strokeWidth={2.25}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="clients"
                stroke="var(--color-clients)"
                strokeWidth={2.25}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </GraphChartCard>

        <GraphChartCard
          title="Xizmatlar reytingi"
          description="Eng ko'p bron qilingan xizmatlar"
          icon={<Scissors className="size-4" strokeWidth={2.2} />}
        >
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
            <BarChart
              data={serviceChart}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="4 4" className="stroke-border/50" />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} className="text-[10px]" />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={108}
                className="text-[10px]"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 8, 8, 0]} maxBarSize={24} />
            </BarChart>
          </ChartContainer>
        </GraphChartCard>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-2">
          <PieChartIcon className="size-4 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold">Tahlil</h2>
          <span className="text-xs text-muted-foreground">— ulush va natijalar</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <GraphChartCard
            title="To'lov ulushi"
            icon={<Wallet className="size-4" strokeWidth={2.2} />}
            bodyClassName="py-4"
          >
            <DonutChartBlock
              data={paymentMix}
              centerLabel="Jami"
              centerValue={formatAdminUzs(totalRevenue)}
              formatValue={uzsTooltip}
            />
          </GraphChartCard>

          <GraphChartCard
            title="Mijoz turlari"
            description={`Qaytuvchi ${repeatRate.toFixed(0)}%`}
            icon={<Users className="size-4" strokeWidth={2.2} />}
            bodyClassName="py-4"
          >
            <DonutChartBlock
              data={clientMix}
              centerLabel="Jami"
              centerValue={String((analytics?.unique_clients ?? 0) || clientMix.reduce((s, r) => s + r.value, 0))}
            />
          </GraphChartCard>

          <GraphChartCard
            title="Bron natijasi"
            description={`Yakunlash ${completionRate.toFixed(0)}%`}
            icon={<Activity className="size-4" strokeWidth={2.2} />}
            className="md:col-span-2 xl:col-span-1"
            bodyClassName="py-4"
          >
            <DonutChartBlock
              data={bookingOutcome}
              centerLabel="Jami"
              centerValue={String(completedCount + cancelledCount)}
            />
          </GraphChartCard>
        </div>
      </div>
    </div>
  );
}
