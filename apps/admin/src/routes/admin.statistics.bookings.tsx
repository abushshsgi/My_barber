import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { downloadStatisticsCsv, fetchPlatformBookings } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/bookings")({
  component: StatisticsBookingsPage,
});

const STATUS_TABS = [
  { key: "", label: "Hammasi" },
  { key: "completed", label: "Yakunlangan" },
  { key: "pending", label: "Kutilmoqda" },
  { key: "in_progress", label: "Jarayonda" },
  { key: "cancelled", label: "Bekor" },
  { key: "rejected", label: "Rad etilgan" },
];

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Naqd",
  online: "Onlayn",
};

function StatisticsBookingsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["admin", "stats-bookings", range.start, range.end, status, paymentMethod, page],
    queryFn: () => fetchPlatformBookings({ range, status, paymentMethod, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });

  const d = q.data;
  const maxFunnel = Math.max(1, ...(d?.funnel.map((f) => f.count) ?? [1]));

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Bronlar"
        description="Bron funneli, muvaffaqiyat darajasi va to'liq ro'yxat."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
        onExport={() => downloadStatisticsCsv("bookings", { range, status, paymentMethod })}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {q.isLoading || !d ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Jami bron" value={d.summary.total.toLocaleString()} icon={CalendarClock} />
            <KPICard label="Muvaffaqiyatli" value={d.summary.completed.toLocaleString()} icon={CheckCircle2} />
            <KPICard label="Bekor / rad" value={d.summary.cancelled.toLocaleString()} icon={XCircle} />
            <KPICard label="Muvaffaqiyat" value={`${d.summary.success_rate}%`} />
            <KPICard label="Naqd to'lov" value={d.summary.cash_count.toLocaleString()} hint={`${d.summary.cash_barbers} sartarosh · ${d.summary.cash_salons} salon`} />
            <KPICard label="Onlayn to'lov" value={d.summary.online_count.toLocaleString()} />
          </>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-5 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Bron jarayoni (funnel)</h2>
        <p className="text-sm text-muted-foreground mt-1">Har bir bosqichdagi bronlar soni</p>
        {q.isLoading || !d ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-muted/40" />
        ) : (
          <ul className="mt-5 space-y-3">
            {d.funnel.map((step) => (
              <li key={step.status} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-muted-foreground">{step.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded-md bg-foreground/70 px-2 text-[11px] font-semibold text-background"
                    style={{ width: `${Math.max(6, (step.count / maxFunnel) * 100)}%` }}
                  >
                    {step.count}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              type="button"
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                status === tab.key ? "bg-background font-medium shadow-card" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {[
            { key: "", label: "Barcha to'lov" },
            { key: "cash", label: "Naqd" },
            { key: "online", label: "Onlayn" },
          ].map((tab) => (
            <button
              key={tab.key || "all"}
              type="button"
              onClick={() => {
                setPaymentMethod(tab.key);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                paymentMethod === tab.key ? "bg-background font-medium shadow-card" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold">Bronlar ro'yxati</h2>
          <p className="text-sm text-muted-foreground mt-1">Har bir bronning ID, buyurtma raqami va tafsilotlari</p>
        </div>
        {q.isLoading && !d ? (
          <TableSkeleton rows={10} cols={7} />
        ) : !d || d.results.length === 0 ? (
          <EmptyState title="Bron topilmadi" description="Filtrlarni o'zgartirib qayta urinib ko'ring." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">Buyurtma</th>
                    <th className="px-6 py-3 font-medium">Mijoz</th>
                    <th className="px-6 py-3 font-medium">Sartarosh / salon</th>
                    <th className="px-6 py-3 font-medium">Holat</th>
                    <th className="px-6 py-3 font-medium">To'lov</th>
                    <th className="px-6 py-3 font-medium text-right">Narx</th>
                    <th className="px-6 py-3 font-medium">Vaqt</th>
                    <th className="px-6 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {d.results.map((b: Record<string, unknown>) => (
                    <tr key={String(b.id)} className="hover:bg-background/50">
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold">{String(b.order_number || `#${b.id}`)}</div>
                        <div className="text-[11px] text-muted-foreground">ID {String(b.id)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{String(b.customer_name || "—")}</div>
                        <div className="text-xs text-muted-foreground">{String(b.customer_phone || "")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{String(b.barber_name || "—")}</div>
                        <div className="text-xs text-muted-foreground">{String(b.salon_name || "")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={String(b.status)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">{PAYMENT_LABELS[String(b.payment_method)] || String(b.payment_method)}</div>
                        <div className="text-[11px] text-muted-foreground">{String(b.payment_status)}</div>
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums font-semibold">
                        {formatAdminUzs(Number(b.total_price) || 0)}
                      </td>
                      <td className="px-6 py-4 tabular-nums text-muted-foreground">
                        {b.start_at ? format(new Date(String(b.start_at)), "dd.MM.yyyy HH:mm") : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          to="/admin/bookings/$bookingId"
                          params={{ bookingId: String(b.id) }}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Batafsil
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={d.page}
              totalPages={d.total_pages}
              count={d.count}
              pageSize={50}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
