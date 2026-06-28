import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatAdminUzs, type DailyChartItem } from "@/lib/admin-analytics";

const chartConfig = {
  amount: { label: "Daromad", color: "hsl(var(--foreground))" },
};

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return String(value);
}

export function AdminDailyRevenueChart({
  items,
  tickInterval = 0,
  emptyLabel = "Ma'lumot yo'q.",
}: {
  items: DailyChartItem[];
  tickInterval?: number;
  emptyLabel?: string;
}) {
  if (items.length === 0 || !items.some((i) => i.amount > 0)) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <BarChart data={items} margin={{ top: 12, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval={tickInterval > 0 ? tickInterval : 0}
          minTickGap={tickInterval > 0 ? 0 : 24}
          className="text-[10px]"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={44}
          tickFormatter={formatAxisValue}
          className="text-[10px]"
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as DailyChartItem | undefined;
                return row?.date ?? "";
              }}
              formatter={(value, _name, item) => {
                const row = item.payload as DailyChartItem;
                return (
                  <div className="flex w-full flex-col gap-0.5">
                    <span className="font-semibold">{formatAdminUzs(Number(value))}</span>
                    {row.bookings > 0 ? (
                      <span className="text-muted-foreground">{row.bookings} ta bron</span>
                    ) : null}
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ChartContainer>
  );
}
