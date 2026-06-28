import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { formatUZS } from "@/components/barber/BarberContext";
import { SectionCard } from "@/components/barber/primitives";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { useBarberStatsMetrics } from "@/hooks/use-barber-stats";

type Metrics = ReturnType<typeof useBarberStatsMetrics>;

const revenueConfig = {
  revenue: { label: "Daromad", color: "hsl(var(--foreground))" },
  cash: { label: "Naqd", color: "hsl(142 76% 36%)" },
  online: { label: "Onlayn", color: "hsl(221 83% 53%)" },
  bookings: { label: "Bronlar", color: "hsl(var(--foreground))" },
  clients: { label: "Mijozlar", color: "hsl(262 83% 58%)" },
};

const PIE_COLORS = ["hsl(var(--foreground))", "hsl(142 76% 36%)", "hsl(221 83% 53%)"];

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

function uzsTooltip(value: unknown) {
  return formatUZS(Number(value) || 0);
}

export function StatsGraphsPanel({ metrics }: { metrics: Metrics }) {
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
    name: s.name.length > 18 ? `${s.name.slice(0, 16)}…` : s.name,
    count: s.count,
  }));

  const periodRows =
    dailyRows.length > 30
      ? monthlyRows
      : dailyRows.length > 14
        ? weeklyRows
        : dailyRows.map((row) => ({ ...row, label: row.date.slice(5), key: row.date }));
  const periodLabel = dailyRows.length > 30 ? "Oylik" : dailyRows.length > 14 ? "Haftalik" : "Kunlik";

  if (!dailyRows.some((row) => row.revenue > 0)) {
    return (
      <SectionCard title="Grafiklar" description="Tanlangan davr uchun ma'lumot yo'q">
        <p className="text-sm text-muted-foreground">Bronlar yakunlangandan keyin grafiklar shu yerda ko&apos;rinadi.</p>
      </SectionCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <SectionCard title="Kunlik daromad" description="Har bir kun bo'yicha savdo">
        <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={dailyRows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => String(v).slice(5)}
              tickLine={false}
              axisLine={false}
              interval={dailyRows.length > 14 ? Math.floor(dailyRows.length / 7) : 0}
              className="text-[10px]"
            />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatAxisValue} className="text-[10px]" />
            <ChartTooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
              content={<ChartTooltipContent formatter={(v) => uzsTooltip(v)} />}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title={`${periodLabel} trend`} description="Davr bo'yicha umumiy dinamika">
        <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
          <LineChart
            data={periodRows}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-[10px]" />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatAxisValue} className="text-[10px]" />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => uzsTooltip(v)} />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Naqd vs onlayn" description="Kunlik to'lov turlari">
        <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={dailyRows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => String(v).slice(5)}
              tickLine={false}
              axisLine={false}
              interval={dailyRows.length > 14 ? Math.floor(dailyRows.length / 7) : 0}
              className="text-[10px]"
            />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={formatAxisValue} className="text-[10px]" />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => uzsTooltip(v)} />} />
            <Legend />
            <Bar dataKey="cash" stackId="pay" fill="var(--color-cash)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="online" stackId="pay" fill="var(--color-online)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Bronlar va mijozlar" description="Kunlik faollik">
        <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
          <LineChart data={dailyRows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => String(v).slice(5)}
              tickLine={false}
              axisLine={false}
              interval={dailyRows.length > 14 ? Math.floor(dailyRows.length / 7) : 0}
              className="text-[10px]"
            />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} className="text-[10px]" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="clients" stroke="var(--color-clients)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="To'lov ulushi" description={`Jami ${formatUZS(totalRevenue)}`}>
        <ChartContainer config={revenueConfig} className="mx-auto aspect-square h-[260px] max-w-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => uzsTooltip(v)} />} />
            <Pie data={paymentMix} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
              {paymentMix.map((entry, index) => (
                <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Mijoz turlari" description={`Qaytuvchi ${repeatRate.toFixed(0)}%`}>
        <ChartContainer config={revenueConfig} className="mx-auto aspect-square h-[260px] max-w-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={clientMix.length ? clientMix : [{ name: "Ma'lumot yo'q", value: 1, key: "empty" }]} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
              {(clientMix.length ? clientMix : [{ name: "Ma'lumot yo'q", value: 1, key: "empty" }]).map((entry, index) => (
                <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Bron natijasi" description={`Yakunlash ${completionRate.toFixed(0)}%`}>
        <ChartContainer config={revenueConfig} className="mx-auto aspect-square h-[260px] max-w-[280px]">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie data={bookingOutcome.length ? bookingOutcome : [{ name: "Ma'lumot yo'q", value: 1, key: "empty" }]} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
              {(bookingOutcome.length ? bookingOutcome : [{ name: "Ma'lumot yo'q", value: 1, key: "empty" }]).map((entry, index) => (
                <Cell key={entry.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard title="Xizmatlar bo'yicha" description="Eng ko'p bron qilingan xizmatlar">
        <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
          <BarChart data={serviceChart} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="4 4" className="stroke-border/60" />
            <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} className="text-[10px]" />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={96} className="text-[10px]" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-revenue)" radius={[0, 6, 6, 0]} maxBarSize={22} />
          </BarChart>
        </ChartContainer>
      </SectionCard>
    </div>
  );
}
