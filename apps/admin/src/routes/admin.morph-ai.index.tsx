import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Coins,
  Cpu,
  DollarSign,
  Sparkles,
  Users,
  Zap,
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
import { format, parseISO } from "date-fns";
import { fetchMorphAiAnalytics, downloadMorphAiCsv } from "@/lib/admin-api";
import {
  StatsPageHeader,
  useStatsRange,
} from "@/components/admin/StatisticsShell";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { MorphAiSeeAllLink } from "@/components/admin/MorphAiSeeAllLink";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/morph-ai/")({
  component: MorphAiPage,
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

function kindLabel(kind: string): string {
  if (kind === "tryon") return "Try-on";
  if (kind === "analyze") return "Tahlil";
  if (kind === "face_check") return "Yuz tekshiruv";
  return kind;
}

function dayLabel(date: string): string {
  try {
    return format(parseISO(date), "dd.MM");
  } catch {
    return date;
  }
}

const chartConfig = {
  cost: { label: "Xarajat ($)", color: "hsl(142 55% 38%)" },
  generations: { label: "Generatsiya", color: "hsl(221 70% 50%)" },
  tokens: { label: "Token", color: "hsl(38 92% 50%)" },
};

function MorphAiPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const [promptRow, setPromptRow] = useState<{
    user_name: string;
    kind: string;
    prompt: string;
    style_title: string;
    cost_usd: string;
    total_tokens: number;
    created_at: string;
  } | null>(null);

  const q = useQuery({
    queryKey: ["admin", "morph-ai", range.start, range.end],
    queryFn: () => fetchMorphAiAnalytics({ range, limit: 10, top: 10 }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const d = q.data;
  const topUsers = d?.top_users.slice(0, 10) ?? [];
  const recentRows = d?.recent.slice(0, 10) ?? [];
  const dailyPreview = useMemo(
    () => [...(d?.daily || [])].slice(-10).reverse(),
    [d?.daily],
  );
  const dailyChart = useMemo(
    () =>
      (d?.daily || []).map((row) => ({
        ...row,
        label: dayLabel(row.date),
        cost: Number(row.cost_usd || 0),
      })),
    [d?.daily],
  );

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Morph AI"
        description="AI Style / try-on foydalanish — kim ishlatyapti, qancha token va xarajat ketayotgani."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
        onExport={async () => {
          await downloadMorphAiCsv(range);
        }}
      >
        <LivePulseBadge label="10s" />
      </StatsPageHeader>

      {/* Live strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {q.isLoading || !d ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="min-h-[120px]" />)
        ) : (
          <>
            <KPICard
              label="Hozir foydalanayotganlar"
              value={d.live.active_users_15m.toLocaleString()}
              icon={Users}
              hint="So'nggi 15 daqiqa"
              className="bg-gradient-to-br from-card to-emerald-500/5"
            />
            <KPICard
              label="15 daqiqada chaqiruv"
              value={d.live.generations_15m.toLocaleString()}
              icon={Zap}
              hint={`Try-on: ${d.live.tryon_15m}`}
            />
            <KPICard
              label="Navbat chuqurligi"
              value={d.live.queue.enabled ? d.live.queue.depth : "—"}
              icon={Activity}
              hint={d.live.queue.enabled ? "Redis try-on queue" : "Navbat o'chirilgan"}
            />
            <KPICard
              label="O'rtacha try-on narxi"
              value={formatUsd(d.summary.tryon_avg_cost_usd)}
              icon={DollarSign}
              hint={`Min ${formatUsd(d.summary.tryon_min_cost_usd)} · Max ${formatUsd(d.summary.tryon_max_cost_usd)}`}
              className="bg-gradient-to-br from-card to-blue-500/5"
            />
          </>
        )}
      </div>

      {/* Period KPIs */}
      {q.isLoading || !d ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard label="Jami generatsiya" value={d.summary.generations.toLocaleString()} icon={Sparkles} />
          <KPICard
            label="Muvaffaqiyat"
            value={`${d.summary.success_rate}%`}
            hint={`${d.summary.success} / ${d.summary.failed} xato`}
          />
          <KPICard label="Unique user" value={d.summary.unique_users.toLocaleString()} icon={Users} />
          <KPICard label="Jami token" value={formatTokens(d.summary.total_tokens)} icon={Cpu} />
          <KPICard
            label="Jami xarajat"
            value={formatUsd(d.summary.total_cost_usd)}
            icon={Coins}
            hint={`O'rtacha ${formatUsd(d.summary.avg_cost_usd)}`}
          />
          <KPICard
            label="O'rtacha latency"
            value={`${d.summary.avg_latency_ms} ms`}
            hint={`Try-on ${d.summary.tryon} · Tahlil ${d.summary.analyze}`}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold">Kunlik xarajat</h2>
              <p className="mt-1 text-sm text-muted-foreground">USD — Gemini / Morph AI chaqiruvlari</p>
            </div>
          </div>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-[260px]" />
          ) : dailyChart.length === 0 ? (
            <EmptyState title="Ma'lumot yo'q" description="Tanlangan davrda generatsiya bo'lmagan." />
          ) : (
            <>
              <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
                <AreaChart data={dailyChart} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillMorphCost" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#fillMorphCost)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Generatsiya</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyPreview.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.date}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.generations}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUsd(row.cost_usd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <MorphAiSeeAllLink kind="daily" />
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Kunlik generatsiya</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try-on va tahlil chaqiruvlari soni</p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-[260px]" />
          ) : dailyChart.length === 0 ? (
            <EmptyState title="Ma'lumot yo'q" description="Tanlangan davrda generatsiya bo'lmagan." />
          ) : (
            <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
              <BarChart data={dailyChart} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="generations" fill="var(--color-generations)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>

      {/* Top spenders */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Kim qancha xarajat qilmoqda</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Token va USD bo'yicha eng ko'p ishlatgan foydalanuvchilar
            </p>
          </div>
        </div>
        {q.isLoading || !d ? (
          <CardSkeleton className="mt-4 h-40" />
        ) : topUsers.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Hali foydalanuvchi yo'q"
            description="Morph AI ishlatilganda bu yerda ro'yxat chiqadi."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead className="text-right">Generatsiya</TableHead>
                  <TableHead className="text-right">Try-on</TableHead>
                  <TableHead className="text-right">Token</TableHead>
                  <TableHead className="text-right">Xarajat</TableHead>
                  <TableHead className="text-right">Oxirgi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u) => (
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
                    <TableCell className="text-right tabular-nums">{u.generations}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.tryon}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatTokens(u.tokens)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatUsd(u.cost_usd)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {u.last_at
                        ? format(parseISO(u.last_at), "dd.MM HH:mm")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <MorphAiSeeAllLink kind="spenders" />
          </div>
        )}
      </div>

      {/* Recent generations with prompts */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <h2 className="font-heading text-lg font-semibold">So'nggi generatsiyalar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Eng oxirgi 10 ta — to'liq tarix uchun Barchasi
        </p>
        {q.isLoading || !d ? (
          <CardSkeleton className="mt-4 h-48" />
        ) : recentRows.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="Generatsiya yo'q"
            description="Foydalanuvchilar AI Style ishlatganda yozuvlar shu yerda paydo bo'ladi."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Tur</TableHead>
                  <TableHead>Uslub</TableHead>
                  <TableHead className="text-right">Token</TableHead>
                  <TableHead className="text-right">Narx</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn("cursor-pointer", row.prompt && "hover:bg-muted/40")}
                    onClick={() =>
                      setPromptRow({
                        user_name: row.user_name,
                        kind: row.kind,
                        prompt: row.prompt || row.error_detail || "—",
                        style_title: row.style_title,
                        cost_usd: row.cost_usd,
                        total_tokens: row.total_tokens,
                        created_at: row.created_at,
                      })
                    }
                  >
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(parseISO(row.created_at), "dd.MM HH:mm:ss")}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate font-medium">{row.user_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{kindLabel(row.kind)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">
                      {row.style_title || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTokens(row.total_tokens)}
                      {row.tokens_estimated ? (
                        <span className="ml-1 text-[10px] text-muted-foreground">~</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatUsd(row.cost_usd)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "success" ? "default" : "destructive"}
                        className="capitalize"
                      >
                        {row.status === "success" ? "OK" : "Xato"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <MorphAiSeeAllLink kind="generations" />
          </div>
        )}
      </div>

      <Dialog open={!!promptRow} onOpenChange={(open) => !open && setPromptRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Generatsiya prompti</DialogTitle>
            <DialogDescription>
              {promptRow
                ? `${promptRow.user_name} · ${kindLabel(promptRow.kind)} · ${formatUsd(promptRow.cost_usd)} · ${formatTokens(promptRow.total_tokens)} token`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {promptRow?.style_title ? (
            <p className="text-sm text-muted-foreground">Uslub: {promptRow.style_title}</p>
          ) : null}
          <pre className="max-h-[50vh] overflow-auto rounded-xl border border-border bg-muted/30 p-4 text-xs leading-relaxed whitespace-pre-wrap">
            {promptRow?.prompt}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
