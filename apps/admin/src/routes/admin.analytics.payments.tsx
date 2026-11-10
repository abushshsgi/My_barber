import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Limitations, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  FetchBar,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import {
  CompactMetrics,
  MetricBand,
  Panel,
  PaymentBridge,
  PaymentMix,
  formatStamp,
  metricFromKpi,
  statusTone,
} from "@/components/admin/analytics-blocks";
import { fetchAnalyticsPayments } from "@/lib/revenue-analytics";
import { fetchAdminSubscriptionPayments } from "@/lib/admin-api";
import { PAYME_STATUS_LABEL } from "@/lib/payme-payment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics/payments")({
  component: PaymentsPage,
});

const FILTERS = [
  { id: "", label: "Hammasi" },
  { id: "paid", label: "Muvaffaqiyatli" },
  { id: "pending", label: "Kutilmoqda" },
  { id: "failed", label: "Muvaffaqiyatsiz" },
  { id: "cancelled", label: "Bekor" },
  { id: "expired", label: "Muddati o'tgan" },
  { id: "refunded", label: "Qaytarilgan" },
] as const;

const MONEY_KEYS = new Set(["confirmed_revenue_uzs", "refunded_uzs", "net_revenue_uzs"]);

function PaymentsPage() {
  const period = useAnalyticsPeriod();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["analytics", "payments", period.query],
    queryFn: () => fetchAnalyticsPayments(period.query),
    placeholderData: keepPreviousData,
  });
  const bounds = query.data?.period;
  const attempts = useQuery({
    queryKey: ["analytics", "payment-rows", bounds?.start, bounds?.end, status, page],
    queryFn: () =>
      fetchAdminSubscriptionPayments({
        status: status || undefined,
        start: bounds?.start,
        end: bounds?.end,
        page,
      }),
    enabled: Boolean(bounds?.start && bounds?.end),
    placeholderData: keepPreviousData,
  });

  const data = query.data;
  if (query.isPending && !data) return <AnalyticsSkeleton />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return null;

  const rates = data.rates;
  const primary = data.kpis.filter((kpi) =>
    ["attempts", "unique_users", "successful", "confirmed_revenue_uzs", "net_revenue_uzs"].includes(
      kpi.key,
    ),
  );
  const rest = data.kpis.filter((kpi) => !primary.includes(kpi));
  const attemptsKpi = data.kpis.find((kpi) => kpi.key === "attempts");
  const successKpi = data.kpis.find((kpi) => kpi.key === "successful");
  const rows = attempts.data?.results ?? [];
  const hasNext = page * 50 < (attempts.data?.count ?? 0);

  return (
    <div
      className={query.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={query.isFetching || attempts.isFetching} />
      <SectionIntro
        title="To'lovlar"
        description="Tasdiq faqat serverdagi Payme tekshiruvidan. Yo'naltirish sahifa ochilganini bildirmaydi."
      />
      <PaymentBridge
        attempts={attemptsKpi?.current ?? null}
        redirected={rates.redirect_attempted}
        successful={successKpi?.current ?? null}
        successRate={rates.success_rate}
        checkoutRate={rates.checkout_to_payment_rate}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Rate label="To'lov tasdiq ulushi" value={rates.success_rate} suffix="%" />
        <Rate
          label="Yo'naltirishdan tasdiqqacha"
          value={rates.checkout_to_payment_rate}
          suffix="%"
        />
        <Rate label="O'rtacha tasdiqlangan summa" value={rates.average_amount_uzs} suffix=" so'm" />
      </div>
      <PaymentMix kpis={data.kpis} />
      <MetricBand
        metrics={primary.map((kpi) =>
          metricFromKpi({ ...kpi, unit: MONEY_KEYS.has(kpi.key) ? "uzs" : kpi.unit }),
        )}
      />
      <CompactMetrics
        metrics={rest.map((kpi) =>
          metricFromKpi({ ...kpi, unit: MONEY_KEYS.has(kpi.key) ? "uzs" : kpi.unit }),
        )}
      />
      {data.note ? <p className="text-sm text-muted-foreground">{data.note}</p> : null}
      <Panel
        title="Urinishlar"
        description="Karta, chek va tranzaksiya raqamlari ko'rsatilmaydi. Tashlab ketilgan holat yuqoridagi hisobda."
        action={
          <span className="text-xs tabular-nums text-muted-foreground">
            {attempts.data?.count ?? 0} ta
          </span>
        }
        bodyClassName="p-0"
      >
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-3">
          {FILTERS.map((filter) => (
            <button
              key={filter.id || "all"}
              type="button"
              onClick={() => {
                setStatus(filter.id);
                setPage(1);
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm transition-colors",
                status === filter.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {attempts.isError ? (
          <p className="px-4 py-6 text-sm text-destructive">{errorText(attempts.error)}</p>
        ) : attempts.isPending ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Urinishlar yuklanmoqda…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Bu filtrda urinish yo'q.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  {["Foydalanuvchi", "Tarif", "Summa", "Holat", "Yaratilgan", "To'langan"].map(
                    (label) => (
                      <th key={label} className="px-4 py-3 font-medium">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">
                      {row.user_name || row.user?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3">{row.plan_code}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.amount_uzs.toLocaleString("uz-UZ")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          statusTone(row.status),
                        )}
                      >
                        {PAYME_STATUS_LABEL[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatStamp(row.created_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatStamp(row.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-border px-4 py-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Oldingi
          </button>
          <span className="tabular-nums text-muted-foreground">{page}</span>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40"
          >
            Keyingi
          </button>
        </div>
      </Panel>
      <Limitations items={data.limitations} />
    </div>
  );
}

function Rate({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-heading text-2xl font-semibold tabular-nums">
        {value == null ? "—" : `${value.toLocaleString("uz-UZ")}${suffix}`}
      </div>
    </div>
  );
}
