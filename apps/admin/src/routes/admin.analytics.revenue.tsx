import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Limitations, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import {
  AnalyticsError,
  AnalyticsSkeleton,
  FetchBar,
  SectionIntro,
  errorText,
} from "@/components/admin/analytics-shell";
import { Panel } from "@/components/admin/analytics-blocks";
import { fetchAnalyticsRevenue } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/revenue")({
  component: RevenuePage,
});

function RevenuePage() {
  const period = useAnalyticsPeriod();
  const query = useQuery({
    queryKey: ["analytics", "revenue", period.query],
    queryFn: () => fetchAnalyticsRevenue(period.query),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  if (query.isPending && !data) return <AnalyticsSkeleton rows={2} />;
  if (query.isError)
    return <AnalyticsError message={errorText(query.error)} onRetry={() => void query.refetch()} />;
  if (!data) return null;

  const groups = [
    {
      title: "Tushum",
      rows: [
        ["Tasdiqlangan tushum", money(data.confirmed_revenue_uzs)],
        ["Premium tushumi", money(data.premium_revenue_uzs)],
        ["Qaytarilgan", money(data.refunded_uzs)],
        ["Sof tushum", money(data.net_revenue_uzs)],
      ],
    },
    {
      title: "Mijozlar",
      rows: [
        ["Yangi to'lovchilar", String(data.new_paying_customers)],
        ["Qaytgan to'lovchilar", String(data.returning_paying_customers)],
        ["To'lovchiga o'rtacha", data.arppu_uzs == null ? "—" : money(data.arppu_uzs)],
        ["Tashrifga o'rtacha", data.arpu_uzs == null ? "—" : money(data.arpu_uzs)],
        [
          "Daromad konversiyasi",
          data.revenue_conversion == null ? "—" : `${data.revenue_conversion}%`,
        ],
      ],
    },
    {
      title: "Obunalar",
      rows: [
        ["Faol pullik obuna", String(data.active_paid_subscriptions)],
        ["Muddati tugagan", String(data.expired_subscriptions)],
        ["Bekor qilingan", String(data.cancelled_subscriptions)],
        ["30 kunlik huquq qiymati", money(data.active_entitlement_value_uzs)],
        ["MRR", data.mrr_available ? "Mavjud" : "Mavjud emas"],
      ],
    },
  ];

  return (
    <div
      className={query.isPlaceholderData ? "space-y-5 opacity-80 transition-opacity" : "space-y-5"}
    >
      <FetchBar active={query.isFetching} />
      <SectionIntro
        title="Daromad"
        description="Tasdiqlangan Payme to'lovlari. Kutilayotgan summa kirmaydi. Bir martalik to'lov MRR emas."
      />
      <section className="rounded-2xl border border-border bg-card px-5 py-5 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Sof tushum
        </p>
        <p className="ax-tick mt-2 font-heading text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
          {money(data.net_revenue_uzs)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Tasdiqlangan {money(data.confirmed_revenue_uzs)}
        </p>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <Panel key={group.title} title={group.title} bodyClassName="p-0">
            <ul>
              {group.rows.map(([label, value]) => (
                <li
                  key={label}
                  className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-right text-sm font-medium tabular-nums">{value}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      {!data.mrr_available && data.mrr_reason ? (
        <p className="text-sm text-muted-foreground">{data.mrr_reason}</p>
      ) : null}
      <Limitations items={data.limitations} />
    </div>
  );
}

function money(value: number) {
  return `${Math.round(value).toLocaleString("uz-UZ")} so'm`;
}
