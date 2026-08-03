import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Activity,
  Coins,
  Cpu,
  ImagePlus,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { StatsPageHeader, useStatsRange } from "@/components/admin/StatisticsShell";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fetchMorphAiStudio } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/morph-ai/studio")({
  component: MorphStudioOpsPage,
});

function formatUsd(raw: string | number | undefined): string {
  const n = typeof raw === "number" ? raw : Number(raw || 0);
  if (!Number.isFinite(n)) return "$0.00";
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function planBadge(plan: string, status: string) {
  if (!plan || status === "none") {
    return <Badge variant="outline">Obuna yo&apos;q</Badge>;
  }
  const label = plan.charAt(0).toUpperCase() + plan.slice(1);
  const tone =
    plan === "pro"
      ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
      : plan === "plus"
        ? "bg-sky-500/15 text-sky-800 dark:text-sky-200"
        : "bg-muted text-muted-foreground";
  return (
    <Badge variant="secondary" className={cn("font-medium", tone)}>
      {label}
      {status !== "active" ? ` · ${status}` : ""}
    </Badge>
  );
}

function quotaLabel(used: number, limit: number) {
  if (!limit) return `${used} / —`;
  return `${used} / ${limit}`;
}

function MorphStudioOpsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const q = useQuery({
    queryKey: ["admin", "morph-ai", "studio", range.start, range.end],
    queryFn: () => fetchMorphAiStudio({ range, limit: 40, top: 40 }),
    refetchInterval: 60_000,
  });
  const d = q.data;

  const dailyChart = useMemo(() => {
    if (!d?.daily?.length) return [];
    return d.daily.map((row) => ({
      label: (() => {
        try {
          return format(parseISO(row.date), "dd.MM");
        } catch {
          return row.date;
        }
      })(),
      edits: row.edits,
      cost: Number(row.cost_usd || 0),
      users: row.users,
    }));
  }, [d?.daily]);

  const chartConfig = {
    edits: { label: "Tahrirlar", color: "hsl(var(--chart-1))" },
    cost: { label: "USD", color: "hsl(var(--chart-2))" },
  };

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Studio"
        description="Kim Studio’da rasm tahrirlayapti, qancha sarflanyapti va obuna limitlelari."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      >
        {d ? (
          <LivePulseBadge
            label={`${d.live.active_users_15m} faol · ${d.live.edits_15m} tahrir (15m)`}
          />
        ) : null}
      </StatsPageHeader>

      {q.isLoading || !d ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard
            label="Studio tahrirlari"
            value={d.summary.edits.toLocaleString()}
            icon={ImagePlus}
            hint={`${d.summary.success} OK · ${d.summary.failed} xato`}
          />
          <KPICard
            label="Muvaffaqiyat"
            value={`${d.summary.success_rate}%`}
            icon={Sparkles}
          />
          <KPICard
            label="Unique user"
            value={d.summary.unique_users.toLocaleString()}
            icon={Users}
          />
          <KPICard
            label="Studio xarajati"
            value={formatUsd(d.summary.total_cost_usd)}
            icon={Coins}
            hint={`O'rtacha ${formatUsd(d.summary.avg_cost_usd)}`}
          />
          <KPICard
            label="Token"
            value={formatTokens(d.summary.total_tokens)}
            icon={Cpu}
            hint={`~${d.summary.avg_latency_ms} ms`}
          />
          <KPICard
            label="Oy (billing)"
            value={d.billing_period.morph_studio_used_total.toLocaleString()}
            icon={Activity}
            hint={`${d.billing_period.users_with_studio_usage} user · ${d.billing_period.start} → ${d.billing_period.end}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Kunlik Studio xarajati</h2>
          <p className="mt-1 text-sm text-muted-foreground">USD — faqat Studio tahrirlari</p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-[260px]" />
          ) : dailyChart.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="Ma'lumot yo'q"
              description="Tanlangan davrda Studio tahriri bo'lmagan."
            />
          ) : (
            <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
              <AreaChart data={dailyChart} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillStudioCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-cost)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-cost)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="var(--color-cost)"
                  fill="url(#fillStudioCost)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Kunlik tahrirlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nechta rasm tahrirlandi</p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-[260px]" />
          ) : dailyChart.length === 0 ? (
            <EmptyState className="mt-4" title="Ma'lumot yo'q" />
          ) : (
            <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
              <BarChart data={dailyChart} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="edits" fill="var(--color-edits)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Kim Studio ishlatyapti</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tahrirlar, USD xarajat, obuna rejasi va oylik Studio limitleari (DB)
        </p>
        {q.isLoading || !d ? (
          <CardSkeleton className="mt-4 h-40" />
        ) : !d.top_users.length ? (
          <EmptyState
            className="mt-4"
            title="Hali Studio user yo'q"
            description="Mijoz Studio’da tahrir qilganda shu yerda chiqadi."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead>Obuna</TableHead>
                  <TableHead className="text-right">Studio oy</TableHead>
                  <TableHead className="text-right">Tahrir</TableHead>
                  <TableHead className="text-right">OK / Xato</TableHead>
                  <TableHead className="text-right">Xarajat</TableHead>
                  <TableHead className="text-right">Oxirgi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.top_users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="min-w-0">
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: String(u.user_id) }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {u.name}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.phone || u.email || `ID ${u.user_id}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {planBadge(u.plan_code, u.subscription_status)}
                        {u.subscription_id ? (
                          <Link
                            to="/admin/subscriptions/$subId"
                            params={{ subId: u.subscription_id }}
                            className="text-xs text-muted-foreground hover:underline"
                          >
                            Obuna batafsil
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {quotaLabel(u.morph_studio_used, u.morph_studio_limit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{u.edits}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {u.success} / {u.failed}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatUsd(u.cost_usd)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {u.last_at ? format(parseISO(u.last_at), "dd.MM HH:mm") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Eng ko&apos;p presetlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Qaysi Studio variantlari tanlanmoqda</p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-40" />
          ) : !d.top_presets.length ? (
            <EmptyState className="mt-4" title="Preset yo'q" />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant</TableHead>
                    <TableHead className="text-right">Tahrir</TableHead>
                    <TableHead className="text-right">User</TableHead>
                    <TableHead className="text-right">USD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.top_presets.map((p) => (
                    <TableRow key={`${p.style_id}-${p.style_title}`}>
                      <TableCell>
                        <p className="font-medium">{p.style_title || p.style_id || "—"}</p>
                        <p className="text-xs text-muted-foreground">{p.style_id || "—"}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{p.edits}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.users}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(p.cost_usd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">So&apos;nggi Studio tahrirlari</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Har bir yozuv DB da (`AiGenerationUsage`, kind=studio)
          </p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-40" />
          ) : !d.recent.length ? (
            <EmptyState className="mt-4" title="Hali tahrir yo'q" />
          ) : (
            <div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
              {d.recent.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {item.user_id ? (
                        <Link
                          to="/admin/users/$userId"
                          params={{ userId: String(item.user_id) }}
                          className="font-medium hover:underline"
                        >
                          {item.user_name}
                        </Link>
                      ) : (
                        <span className="font-medium">{item.user_name}</span>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {item.style_title || item.style_id || "Studio"} · {item.model || "—"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {planBadge(item.plan_code, item.subscription_status)}
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {format(parseISO(item.created_at), "dd.MM HH:mm")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "font-medium",
                        item.status === "success" ? "text-emerald-600" : "text-destructive",
                      )}
                    >
                      {item.status === "success" ? "OK" : "Xato"}
                    </span>
                    <span>{formatUsd(item.cost_usd)}</span>
                    <span>{formatTokens(item.total_tokens)} tok</span>
                    <span>{item.latency_ms} ms</span>
                    <span>
                      Oy: {quotaLabel(item.morph_studio_used, item.morph_studio_limit)}
                    </span>
                  </div>
                  {item.error_detail ? (
                    <p className="mt-1 text-xs text-destructive">{item.error_detail}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
