import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Percent,
  Repeat,
  Search,
  Sparkles,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  adminGrantSubscription,
  fetchAdminSubscriptionPayments,
  fetchAdminSubscriptionStats,
  fetchAdminSubscriptions,
  type AdminSubscriptionPaymentRow,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/subscriptions")({
  component: AdminSubscriptionsPage,
});

const STATUS_LABEL: Record<string, string> = {
  active: "Faol",
  expired: "Tugagan",
  deactivated: "O'chirilgan",
  cancelled: "Bekor",
  pending: "Kutilmoqda",
};

const SOURCE_LABEL: Record<string, string> = {
  wallet: "Hamyon",
  click: "Click",
  payme: "Payme",
  referral_trial: "Referal sinov",
  admin: "Admin",
};

type TabId = "overview" | "subscriptions" | "payments" | "discounts";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("overview");
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [payQ, setPayQ] = useState("");
  const [paySearch, setPaySearch] = useState("");
  const [payDiscounted, setPayDiscounted] = useState(false);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlan, setGrantPlan] = useState("plus");
  const [grantDays, setGrantDays] = useState("30");

  const statsQ = useQuery({
    queryKey: ["admin", "subscriptions", "stats"],
    queryFn: () => fetchAdminSubscriptionStats(),
  });

  const listQ = useQuery({
    queryKey: ["admin", "subscriptions", "list", status, search],
    queryFn: () =>
      fetchAdminSubscriptions({ status: status || undefined, q: search || undefined }),
    enabled: tab === "subscriptions" || tab === "overview",
  });

  const paymentsDiscounted = tab === "discounts" ? true : payDiscounted;

  const paymentsQ = useQuery({
    queryKey: ["admin", "subscriptions", "payments", paySearch, paymentsDiscounted],
    queryFn: () =>
      fetchAdminSubscriptionPayments({
        status: "paid",
        q: paySearch || undefined,
        discounted: paymentsDiscounted || undefined,
      }),
    enabled: tab === "payments" || tab === "discounts",
  });

  const grantM = useMutation({
    mutationFn: adminGrantSubscription,
    onSuccess: () => {
      toast.success("Obuna berildi");
      void qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
      setGrantUserId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = statsQ.data;

  const chartData = useMemo(() => {
    if (!stats?.purchases_by_day?.length) return [];
    return stats.purchases_by_day.map((d) => ({
      ...d,
      label: dayLabel(d.date),
    }));
  }, [stats?.purchases_by_day]);

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "overview", label: "Umumiy" },
    { id: "subscriptions", label: "Obunalar" },
    { id: "payments", label: "Sotuvlar" },
    { id: "discounts", label: "Chegirmalar" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">B2C Obunalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kim qachon sotib olgan, nechta xaridor, chegirma bilan sotuvlar — barcha ma'lumotlar
          saqlanadi va shu yerda ko'rinadi.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {statsQ.isLoading ? (
        <CardSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard label="Faol obuna" value={String(stats.active_count)} icon={Repeat} />
          <KPICard
            label="Unikal xaridorlar"
            value={String(stats.unique_buyers ?? 0)}
            hint={`Bugun ${stats.buyers_today ?? 0} · Hafta ${stats.buyers_this_week ?? 0}`}
            icon={Users}
          />
          <KPICard
            label="Daromad (to'langan)"
            value={formatAdminUzs(stats.revenue_uzs)}
            hint={`${stats.paid_count} ta to'lov`}
            icon={Wallet}
          />
          <KPICard
            label="Chegirma bilan"
            value={String(stats.discounted_count ?? 0)}
            hint={`${formatAdminUzs(stats.discount_total_uzs ?? 0)} chegirma`}
            icon={Percent}
          />
        </div>
      ) : null}

      {tab === "overview" && stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              label="Bugungi sotuv"
              value={String(stats.purchases_today ?? 0)}
              hint={`${stats.buyers_today ?? 0} kishi`}
              size="hero"
            />
            <KPICard
              label="Shu hafta"
              value={String(stats.purchases_this_week ?? 0)}
              hint={`${stats.buyers_this_week ?? 0} kishi`}
            />
            <KPICard
              label="Shu oy"
              value={String(stats.purchases_this_month ?? 0)}
              hint={`${stats.buyers_this_month ?? 0} kishi`}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-heading text-lg font-semibold">Kunlik sotuvlar</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Har kuni nechta obuna sotilgan va nechta unikal xaridor.
            </p>
            <div className="mt-4">
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali sotuv yo'q.</p>
              ) : (
                <ChartContainer
                  config={{
                    count: { label: "Sotuv", color: "hsl(var(--foreground))" },
                    buyers: { label: "Xaridor", color: "hsl(var(--muted-foreground))" },
                  }}
                  className="aspect-auto h-[240px] w-full"
                >
                  <BarChart data={chartData} margin={{ top: 12, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="4 4"
                      className="stroke-border/60"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-[10px]"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      width={32}
                      allowDecimals={false}
                      className="text-[10px]"
                    />
                    <ChartTooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
                      content={<ChartTooltipContent />}
                    />
                    <Bar
                      dataKey="count"
                      fill="var(--color-count)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="buyers"
                      fill="var(--color-buyers)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-base font-semibold">Reja bo'yicha (faol)</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {stats.by_plan.length === 0 ? (
                  <li className="text-muted-foreground">Hali yo'q</li>
                ) : (
                  stats.by_plan.map((p) => (
                    <li key={p.plan_code} className="flex justify-between">
                      <span className="capitalize">{p.plan_code}</span>
                      <span className="font-semibold">{p.count}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-base font-semibold">Sotuv rejalar</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(stats.by_plan_purchases ?? []).length === 0 ? (
                  <li className="text-muted-foreground">Hali yo'q</li>
                ) : (
                  (stats.by_plan_purchases ?? []).map((p) => (
                    <li key={p.plan_code} className="space-y-0.5">
                      <div className="flex justify-between">
                        <span className="capitalize">{p.plan_code}</span>
                        <span className="font-semibold">{p.count}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{p.buyers} xaridor</span>
                        <span>{formatAdminUzs(p.revenue_uzs)}</span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-base font-semibold">Admin grant</h2>
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="User ID"
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    className="h-10 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    value={grantPlan}
                    onChange={(e) => setGrantPlan(e.target.value)}
                  >
                    <option value="starter">Starter</option>
                    <option value="plus">Plus</option>
                    <option value="pro">Pro</option>
                  </select>
                  <Input
                    className="w-20"
                    value={grantDays}
                    onChange={(e) => setGrantDays(e.target.value)}
                    placeholder="Kun"
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!grantUserId || grantM.isPending}
                  onClick={() =>
                    grantM.mutate({
                      user_id: Number(grantUserId),
                      plan_code: grantPlan,
                      days: Number(grantDays) || 30,
                    })
                  }
                >
                  Obuna berish
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold">So'nggi sotuvlar</h2>
                <Button variant="ghost" size="sm" onClick={() => setTab("payments")}>
                  Hammasi
                </Button>
              </div>
              <PurchaseTable rows={stats.recent_purchases ?? []} empty="Hali sotuv yo'q" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold">Chegirma bilan</h2>
                <Button variant="ghost" size="sm" onClick={() => setTab("discounts")}>
                  Hammasi
                </Button>
              </div>
              <PurchaseTable
                rows={stats.recent_discounted ?? []}
                empty="Chegirma bilan sotuv yo'q"
                showPromo
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-base font-semibold">Manba</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {stats.by_source.map((s) => (
                  <li key={s.source} className="flex justify-between">
                    <span>{SOURCE_LABEL[s.source] || s.source}</span>
                    <span className="font-semibold">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-base font-semibold">To'lov provayder</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {(stats.by_provider ?? []).length === 0 ? (
                  <li className="text-muted-foreground">Hali yo'q</li>
                ) : (
                  (stats.by_provider ?? []).map((p) => (
                    <li key={p.provider} className="flex justify-between">
                      <span className="capitalize">{p.provider}</span>
                      <span className="font-semibold">
                        {p.count} · {formatAdminUzs(p.revenue_uzs)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4" /> Morph foydalanish
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>Morph AI</span>
                  <span className="font-semibold">{stats.usage_totals.morph_ai}</span>
                </li>
                <li className="flex justify-between">
                  <span>Studio</span>
                  <span className="font-semibold">{stats.usage_totals.morph_studio}</span>
                </li>
                <li className="flex justify-between">
                  <span>Referal sinov</span>
                  <span className="font-semibold">{stats.referral_trials_granted}</span>
                </li>
              </ul>
            </div>
          </div>

          {stats.recent_events?.length ? (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-lg font-semibold">So'nggi hodisalar</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {stats.recent_events.slice(0, 20).map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div>
                      <span className="font-medium">{ev.action}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {ev.user_name || ev.user_id || "—"}
                        {ev.plan_code ? ` · ${ev.plan_code}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatWhen(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "subscriptions" ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-lg font-semibold">Obunalar ro'yxati</h2>
            <div className="flex flex-wrap gap-2">
              {["active", "expired", "deactivated", "cancelled", "pending", ""].map((s) => (
                <button
                  key={s || "all"}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    status === s
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {s ? STATUS_LABEL[s] || s : "Hammasi"}
                </button>
              ))}
            </div>
          </div>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q.trim());
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism, telefon, email…"
            />
            <Button type="submit" variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          {listQ.isLoading ? (
            <div className="mt-4">
              <TableSkeleton />
            </div>
          ) : !listQ.data?.results.length ? (
            <EmptyState
              title="Obuna topilmadi"
              description="Filtrni o'zgartiring yoki grant bering."
            />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mijoz</TableHead>
                    <TableHead>Reja</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Manba</TableHead>
                    <TableHead>Narx</TableHead>
                    <TableHead>Sotib olgan</TableHead>
                    <TableHead>Limit (AI / Studio)</TableHead>
                    <TableHead>Tugash</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listQ.data.results.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">
                          {row.user.full_name || row.user.phone || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">{row.user.phone}</div>
                      </TableCell>
                      <TableCell className="capitalize">{row.plan_code}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {STATUS_LABEL[row.status] || row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {SOURCE_LABEL[row.source] || row.source}
                      </TableCell>
                      <TableCell className="tabular-nums text-xs">
                        {formatAdminUzs(row.price_uzs)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatWhen(row.created_at || row.starts_at)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {row.usage.morph_ai_used}/{row.usage.morph_ai_limit} ·{" "}
                        {row.usage.morph_studio_used}/{row.usage.morph_studio_limit}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {row.ends_at ? formatWhen(row.ends_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to="/admin/subscriptions/$subId" params={{ subId: row.id }}>
                            Batafsil
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}

      {tab === "payments" ? (
        <PaymentsPanel
          title="Barcha sotuvlar"
          description="Kim qachon qaysi rejani sotib olgan — to'liq tarix."
          q={payQ}
          setQ={setPayQ}
          onSearch={() => setPaySearch(payQ.trim())}
          discounted={payDiscounted}
          setDiscounted={setPayDiscounted}
          loading={paymentsQ.isLoading}
          rows={paymentsQ.data?.results ?? []}
          count={paymentsQ.data?.count ?? 0}
        />
      ) : null}

      {tab === "discounts" && stats ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard
              label="Chegirmali to'lovlar"
              value={String(stats.discounted_count ?? 0)}
              icon={Tag}
            />
            <KPICard
              label="Chegirma olganlar"
              value={String(stats.discounted_buyers ?? 0)}
              icon={Users}
            />
            <KPICard
              label="Jami chegirma"
              value={formatAdminUzs(stats.discount_total_uzs ?? 0)}
              icon={Percent}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-heading text-lg font-semibold">Promokodlar</h2>
            {(stats.by_promo ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Hali ishlatilmagan.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kod</TableHead>
                      <TableHead>Sotuv</TableHead>
                      <TableHead>Xaridor</TableHead>
                      <TableHead>Chegirma</TableHead>
                      <TableHead>Daromad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(stats.by_promo ?? []).map((p) => (
                      <TableRow key={p.promo_code}>
                        <TableCell>
                          <Badge variant="secondary">{p.promo_code}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{p.count}</TableCell>
                        <TableCell>{p.buyers}</TableCell>
                        <TableCell>{formatAdminUzs(p.discount_uzs)}</TableCell>
                        <TableCell>{formatAdminUzs(p.revenue_uzs)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <PaymentsPanel
            title="Chegirma bilan sotib olganlar"
            description="Promokod ishlatgan mijozlar va vaqt."
            q={payQ}
            setQ={setPayQ}
            onSearch={() => {
              setPayDiscounted(true);
              setPaySearch(payQ.trim());
            }}
            discounted
            setDiscounted={setPayDiscounted}
            loading={paymentsQ.isLoading}
            rows={paymentsQ.data?.results ?? []}
            count={paymentsQ.data?.count ?? stats.discounted_count ?? 0}
            forceDiscounted
          />
        </div>
      ) : null}
    </div>
  );
}

function PurchaseTable({
  rows,
  empty,
  showPromo = false,
}: {
  rows: AdminSubscriptionPaymentRow[];
  empty: string;
  showPromo?: boolean;
}) {
  if (!rows.length) {
    return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="mt-3 divide-y divide-border text-sm">
      {rows.slice(0, 12).map((r) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
          <div className="min-w-0">
            <div className="font-medium truncate">
              {r.user_name || r.user?.full_name || r.user_phone || `#${r.user_id}`}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="capitalize">{r.plan_code}</span>
              {" · "}
              {r.provider}
              {showPromo && r.promo_code ? (
                <>
                  {" · "}
                  <span className="text-foreground font-medium">{r.promo_code}</span>
                  {r.discount_uzs > 0 ? ` (−${formatAdminUzs(r.discount_uzs)})` : ""}
                </>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold tabular-nums">{formatAdminUzs(r.amount_uzs)}</div>
            <div className="text-xs text-muted-foreground">{formatWhen(r.paid_at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PaymentsPanel({
  title,
  description,
  q,
  setQ,
  onSearch,
  discounted,
  setDiscounted,
  loading,
  rows,
  count,
  forceDiscounted = false,
}: {
  title: string;
  description: string;
  q: string;
  setQ: (v: string) => void;
  onSearch: () => void;
  discounted: boolean;
  setDiscounted: (v: boolean) => void;
  loading: boolean;
  rows: AdminSubscriptionPaymentRow[];
  count: number;
  forceDiscounted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">{count} ta yozuv</p>
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ism, telefon, order, promo…"
        />
        {!forceDiscounted ? (
          <label className="flex items-center gap-2 whitespace-nowrap text-sm px-1">
            <input
              type="checkbox"
              checked={discounted}
              onChange={(e) => setDiscounted(e.target.checked)}
            />
            Faqat chegirma
          </label>
        ) : null}
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {loading ? (
        <div className="mt-4">
          <TableSkeleton />
        </div>
      ) : !rows.length ? (
        <EmptyState title="Sotuv topilmadi" description="Filtrni o'zgartiring." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mijoz</TableHead>
                <TableHead>Reja</TableHead>
                <TableHead>Summa</TableHead>
                <TableHead>Chegirma</TableHead>
                <TableHead>Provayder</TableHead>
                <TableHead>Vaqt</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">
                      {row.user?.full_name ||
                        row.user_name ||
                        row.user?.phone ||
                        row.user_phone ||
                        `#${row.user_id}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.user?.phone || row.user_phone || ""}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{row.plan_code}</TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatAdminUzs(row.amount_uzs)}
                    {row.base_uzs > row.amount_uzs ? (
                      <div className="text-xs text-muted-foreground line-through">
                        {formatAdminUzs(row.base_uzs)}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {row.has_discount ? (
                      <div className="text-xs">
                        <Badge variant="secondary">{row.promo_code || "chegirma"}</Badge>
                        <div className="mt-1 text-muted-foreground">
                          −{formatAdminUzs(row.discount_uzs)}
                          {row.discount_pct ? ` (−${row.discount_pct}%)` : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="capitalize text-xs">{row.provider}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatWhen(row.paid_at || row.created_at)}
                  </TableCell>
                  <TableCell>
                    {row.subscription_id ? (
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          to="/admin/subscriptions/$subId"
                          params={{ subId: row.subscription_id }}
                        >
                          Obuna
                        </Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
