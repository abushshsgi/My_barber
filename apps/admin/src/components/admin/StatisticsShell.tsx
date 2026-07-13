import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { StatsRangeKey } from "@/lib/admin-analytics";
import { statsRangeToIsoParams } from "@/lib/admin-analytics";
import type { StatDateRange } from "@/lib/admin-api";

const TABS = [
  { to: "/admin/statistics" as const, label: "Umumiy", exact: true },
  { to: "/admin/statistics/revenue" as const, label: "Daromad" },
  { to: "/admin/statistics/users" as const, label: "Mijozlar" },
  { to: "/admin/statistics/salons" as const, label: "Salonlar" },
  { to: "/admin/statistics/wallet" as const, label: "Hamyon" },
  { to: "/admin/statistics/bookings" as const, label: "Bronlar" },
];

export function StatisticsSubNav() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.to || pathname === `${tab.to}/`
          : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "shrink-0 rounded-lg px-4 py-2 text-sm transition-colors",
              active
                ? "bg-background font-semibold shadow-card text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function useStatsRange(initial: StatsRangeKey = "30d") {
  const [rangeKey, setRangeKey] = useState<StatsRangeKey>(initial);
  const range: StatDateRange = statsRangeToIsoParams(rangeKey);
  return { rangeKey, setRangeKey, range };
}

export function StatsRangePicker({
  value,
  onChange,
}: {
  value: StatsRangeKey;
  onChange: (v: StatsRangeKey) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {(["7d", "30d", "90d"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            value === k
              ? "bg-background font-medium shadow-card text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {k === "7d" ? "7 kun" : k === "30d" ? "30 kun" : "90 kun"}
        </button>
      ))}
    </div>
  );
}

export function ExportButton({ onExport }: { onExport: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const handle = async () => {
    setBusy(true);
    try {
      await onExport();
      toast.success("Yuklab olindi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yuklab olishda xatolik");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-card transition-colors hover:bg-muted disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Yuklab olish
    </button>
  );
}

export function StatsPageHeader({
  title,
  description,
  rangeKey,
  onRangeChange,
  onExport,
  children,
}: {
  title: string;
  description?: string;
  rangeKey?: StatsRangeKey;
  onRangeChange?: (v: StatsRangeKey) => void;
  onExport?: () => Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {rangeKey && onRangeChange ? <StatsRangePicker value={rangeKey} onChange={onRangeChange} /> : null}
        {onExport ? <ExportButton onExport={onExport} /> : null}
      </div>
    </div>
  );
}
