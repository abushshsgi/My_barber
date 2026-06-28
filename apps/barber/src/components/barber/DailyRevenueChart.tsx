import { formatUZS } from "@/components/barber/BarberContext";
import type { DailyChartItem } from "@/lib/finance-range";

export function DailyRevenueChart({
  items,
  emptyLabel = "Ma'lumot yo'q.",
}: {
  items: DailyChartItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0 || !items.some((i) => i.amount > 0)) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex h-40 items-end gap-1 overflow-x-auto pb-2">
      {items.map((item) => (
        <div
          key={item.date}
          className="flex h-full min-w-[28px] flex-1 flex-col items-center gap-1"
        >
          <div className="flex w-full flex-1 flex-col justify-end">
            <div
              className="mx-auto w-6 min-h-[4px] rounded-t bg-foreground/85 transition-colors hover:bg-foreground"
              style={{ height: `${Math.max(4, item.heightPct)}%` }}
              title={`${item.date}: ${formatUZS(item.amount)}`}
            />
          </div>
          <span className="shrink-0 text-[9px] text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
