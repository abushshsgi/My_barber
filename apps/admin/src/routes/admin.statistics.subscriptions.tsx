import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AlertTriangle, Repeat, Sparkles, Users, Wallet } from "lucide-react";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fetchAdminSubscriptionAnalytics } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";

export const Route = createFileRoute("/admin/statistics/subscriptions")({
  component: StatisticsSubscriptionsPage,
});

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  plus: "Plus",
  pro: "Pro",
};

function monthLabel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("uz-UZ", { month: "short", year: "numeric" });
}

function StatisticsSubscriptionsPage() {
  const q = useQuery({
    queryKey: ["admin", "stats-subscriptions"],
    queryFn: fetchAdminSubscriptionAnalytics,
    refetchInterval: 30_000,
  });

  const d = q.data;
  const chartData =
    d?.purchases_by_month
      .slice()
      .reverse()
      .map((row) => ({
        month: monthLabel(row.month),
        buyers: row.buyers,
        count: row.count,
        revenue: row.revenue_uzs,
      })) ?? [];

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Obuna statistikasi"
        description="Sotib olish, Morph AI foydalanish, limit tugashi va oyma-oy yangilanish."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {q.isLoading || !d ? (
          Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} className="min-h-[110px]" />)
        ) : (
          <>
            <KPICard
              label="Faol obunalar"
              value={String(d.active_subscriptions)}
              icon={Users}
              hint={`O‘rtacha ${d.avg_active_subscription_days} kun faol`}
            />
            <KPICard
              label="Limit tugagan"
              value={String(d.limit_exhausted_count)}
              icon={AlertTriangle}
              hint={`30 kunda ${d.limit_hit_users_30d} user · ${d.limit_hit_events_30d} hodisa`}
            />
            <KPICard
              label="Sotib olganlar"
              value={String(d.buyers_total)}
              icon={Wallet}
              hint={`${d.buyers_used_morph} ishlatgan · ${d.buyers_never_used_morph} ishlatmagan`}
            />
            <KPICard
              label="Yangilaganlar (2+ to‘lov)"
              value={String(d.renewers_count)}
              icon={Repeat}
              hint={`1× ${d.payment_count_distribution["1"]} · 2× ${d.payment_count_distribution["2"]} · 3+ ${d.payment_count_distribution["3+"]}`}
            />
            <KPICard
              label="Faol · Morph ishlatmoqda"
              value={String(d.active_using_morph)}
              icon={Sparkles}
              hint={`Ishlatmagan: ${d.active_never_used_morph}`}
            />
            <KPICard
              label="Ishlatmagan xaridorlar"
              value={String(d.buyers_never_used_morph)}
              icon={Users}
              hint="To‘lagan, lekin Morph AI 0 marta"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Tarif bo‘yicha (faol)</h3>
          {q.isLoading || !d ? (
            <TableSkeleton rows={3} />
          ) : d.by_plan.length === 0 ? (
            <EmptyState title="Ma’lumot yo‘q" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarif</TableHead>
                  <TableHead className="text-right">Faol</TableHead>
                  <TableHead className="text-right">Ishlatmoqda</TableHead>
                  <TableHead className="text-right">Ishlatmagan</TableHead>
                  <TableHead className="text-right">Limit tugagan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.by_plan.map((row) => (
                  <TableRow key={row.plan_code}>
                    <TableCell className="font-medium">
                      {PLAN_LABEL[row.plan_code] ?? row.plan_code}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.active}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.using}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.never_used}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-700">
                      {row.limit_exhausted}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Oyma-oy xaridlar</h3>
          {q.isLoading || !d ? (
            <CardSkeleton className="min-h-[220px]" />
          ) : chartData.length === 0 ? (
            <EmptyState title="Hali to‘lovlar yo‘q" />
          ) : (
            <ChartContainer
              config={{
                buyers: { label: "Xaridorlar", color: "hsl(var(--chart-1))" },
                count: { label: "To‘lovlar", color: "hsl(var(--chart-2))" },
              }}
              className="h-[240px] w-full"
            >
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="buyers" fill="var(--color-buyers)" radius={4} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
          {d && chartData.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Oxirgi oy daromadi:{" "}
              {formatAdminUzs(d.purchases_by_month[0]?.revenue_uzs ?? 0)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Limit tugagan foydalanuvchilar</h3>
          <Badge variant="secondary">{d?.limit_exhausted_count ?? 0}</Badge>
        </div>
        {q.isLoading || !d ? (
          <TableSkeleton rows={5} />
        ) : d.limit_exhausted_users.length === 0 ? (
          <EmptyState title="Hozircha limit tugagan faol obuna yo‘q" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead className="text-right">Morph AI</TableHead>
                <TableHead className="text-right">Studio</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.limit_exhausted_users.map((row) => (
                <TableRow key={row.subscription_id}>
                  <TableCell>
                    <div className="font-medium">{row.user_name || `User #${row.user_id}`}</div>
                    <div className="text-xs text-muted-foreground">#{row.user_id}</div>
                  </TableCell>
                  <TableCell>{PLAN_LABEL[row.plan_code] ?? row.plan_code}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.morph_ai_used}/{row.morph_ai_limit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.morph_studio_used}/{row.morph_studio_limit}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to="/admin/subscriptions/$subId"
                      params={{ subId: row.subscription_id }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Ochish
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
