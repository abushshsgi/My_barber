import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const stackedConfig = {
  users: { label: "Mijozlar", color: "hsl(221 70% 50%)" },
  barbers: { label: "Sartaroshlar", color: "hsl(262 55% 52%)" },
  salons: { label: "Salonlar", color: "hsl(142 55% 38%)" },
  google: { label: "Google", color: "hsl(221 70% 50%)" },
  phone: { label: "Telefon", color: "hsl(142 55% 38%)" },
  published: { label: "Chiqarilgan", color: "hsl(142 55% 38%)" },
  pending: { label: "Tekshiruvda", color: "hsl(38 92% 50%)" },
  independent: { label: "Mustaqil", color: "hsl(221 70% 50%)" },
  salon: { label: "Salon bilan", color: "hsl(262 55% 52%)" },
  cash: { label: "Naqd", color: "hsl(142 55% 38%)" },
  online: { label: "Onlayn", color: "hsl(221 70% 50%)" },
};

const PIE_COLORS = [
  "hsl(221 70% 50%)",
  "hsl(142 55% 38%)",
  "hsl(262 55% 52%)",
  "hsl(38 92% 50%)",
  "hsl(var(--muted-foreground))",
];

function formatDayLabel(date: string) {
  try {
    return format(parseISO(date), "dd.MM");
  } catch {
    return date;
  }
}

export function CombinedSignupAreaChart({
  data,
  className,
}: {
  data: Array<{ date: string; users: number; barbers: number; salons: number; total?: number }>;
  className?: string;
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDayLabel(d.date),
  }));

  return (
    <ChartContainer config={stackedConfig} className={cn("aspect-auto h-[280px] w-full", className)}>
      <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-users)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-users)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillBarbers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-barbers)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-barbers)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillSalons" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-salons)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-salons)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
        <YAxis tickLine={false} axisLine={false} tickMargin={4} width={32} className="text-[10px]" allowDecimals={false} />
        <ChartTooltip
          cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
          content={<ChartTooltipContent />}
        />
        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="users"
          stackId="1"
          stroke="var(--color-users)"
          fill="url(#fillUsers)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="barbers"
          stackId="1"
          stroke="var(--color-barbers)"
          fill="url(#fillBarbers)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="salons"
          stackId="1"
          stroke="var(--color-salons)"
          fill="url(#fillSalons)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function DualBarChart({
  data,
  keys,
  className,
}: {
  data: Array<{ date: string; [key: string]: string | number }>;
  keys: [string, string];
  className?: string;
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDayLabel(String(d.date)),
  }));
  const maxVal = Math.max(
    1,
    ...chartData.flatMap((d) => keys.map((k) => Number(d[k]) || 0)),
  );

  return (
    <ChartContainer config={stackedConfig} className={cn("aspect-auto h-[240px] w-full", className)}>
      <BarChart data={chartData} margin={{ top: 12, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={32}
          domain={[0, maxVal]}
          allowDecimals={false}
          className="text-[10px]"
        />
        <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey={keys[0]} fill={`var(--color-${keys[0]})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey={keys[1]} fill={`var(--color-${keys[1]})`} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}

export function DonutChart({
  slices,
  className,
  innerRadius = 52,
  outerRadius = 80,
}: {
  slices: Array<{ name: string; value: number; color?: string }>;
  className?: string;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const filtered = slices.filter((s) => s.value > 0);
  if (filtered.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>;
  }

  const config = Object.fromEntries(
    filtered.map((s, i) => [
      s.name,
      { label: s.name, color: s.color ?? PIE_COLORS[i % PIE_COLORS.length] },
    ]),
  );

  return (
    <ChartContainer config={config} className={cn("mx-auto aspect-square h-[220px] w-full max-w-[280px]", className)}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          strokeWidth={2}
          stroke="hsl(var(--card))"
        >
          {filtered.map((s, i) => (
            <Cell key={s.name} fill={s.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function RevenueStackedBarChart({
  series,
  className,
}: {
  series: Array<{ label: string; cash: number; online: number; total: number }>;
  className?: string;
}) {
  if (series.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>;
  }

  return (
    <ChartContainer config={stackedConfig} className={cn("aspect-auto h-[280px] w-full", className)}>
      <BarChart data={series} margin={{ top: 12, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px]" />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={44}
          tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`)}
          className="text-[10px]"
        />
        <ChartTooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} content={<ChartTooltipContent />} />
        <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="online" stackId="rev" fill="var(--color-online)" radius={[0, 0, 0, 0]} maxBarSize={40} />
        <Bar dataKey="cash" stackId="rev" fill="var(--color-cash)" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  );
}
