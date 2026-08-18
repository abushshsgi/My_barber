import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Activity,
  Coins,
  Cpu,
  MessageCircle,
  MessagesSquare,
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
import {
  fetchMorphAiChat,
  fetchMorphAiChatThread,
  type MorphAiChatThreadDetail,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/morph-ai/chat")({
  component: MorphChatOpsPage,
});

function formatUsd(raw: string | number | undefined): string {
  const n = typeof raw === "number" ? raw : Number(raw || 0);
  if (!Number.isFinite(n)) return "$0.00";
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function formatUzs(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "0 so'm";
  return `${Math.round(n).toLocaleString("uz-UZ")} so'm`;
}

function formatCost(usd: string | number | undefined, uzs?: number): string {
  if (typeof uzs === "number") return `${formatUsd(usd)} · ${formatUzs(uzs)}`;
  return formatUsd(usd);
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

function MorphChatOpsPage() {
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");
  const [threadId, setThreadId] = useState<number | null>(null);

  const q = useQuery({
    queryKey: ["admin", "morph-ai", "chat", range.start, range.end],
    queryFn: () => fetchMorphAiChat({ range, limit: 40, top: 40, threads: 30 }),
    refetchInterval: 30_000,
  });
  const d = q.data;

  const threadQ = useQuery({
    queryKey: ["admin", "morph-ai", "chat", "thread", threadId],
    queryFn: () => fetchMorphAiChatThread(threadId!),
    enabled: threadId != null,
  });
  const threadDetail: MorphAiChatThreadDetail | undefined = threadQ.data;

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
      turns: row.turns,
      cost: Number(row.cost_usd || 0),
      tokens: row.tokens,
      users: row.users,
      prompt: row.prompt_tokens,
    }));
  }, [d?.daily]);

  const chartConfig = {
    turns: { label: "Xabarlar", color: "hsl(var(--chart-1))" },
    cost: { label: "USD", color: "hsl(var(--chart-2))" },
    tokens: { label: "Token", color: "hsl(var(--chart-3))" },
  };

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Morf AI Chat"
        description="Kim chat yozayapti, kontekst, token sarfi va xarajatlar — barcha suhbatlar DB da."
        rangeKey={rangeKey}
        onRangeChange={setRangeKey}
      >
        {d ? (
          <LivePulseBadge
            label={`${d.live.active_users_15m} faol · ${d.live.turns_15m} xabar (15m)`}
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
            label="Chat javoblari"
            value={d.summary.turns.toLocaleString()}
            icon={MessageCircle}
            hint={`${d.summary.success} OK · ${d.summary.failed} xato`}
          />
          <KPICard label="Muvaffaqiyat" value={`${d.summary.success_rate}%`} icon={Sparkles} />
          <KPICard
            label="Unique user"
            value={d.summary.unique_users.toLocaleString()}
            icon={Users}
          />
          <KPICard
            label="Suhbatlar"
            value={d.summary.threads.toLocaleString()}
            icon={MessagesSquare}
            hint={`${d.summary.messages} xabar · ${d.summary.threads_with_context} kontekstli`}
          />
          <KPICard
            label="Xarajat"
            value={formatUsd(d.summary.total_cost_usd)}
            icon={Coins}
            hint={`${formatUzs(d.summary.total_cost_uzs)} · o'rtacha ${formatUsd(d.summary.avg_cost_usd)}`}
          />
          <KPICard
            label="Token / kontekst"
            value={formatTokens(d.summary.total_tokens)}
            icon={Cpu}
            hint={`Prompt ~${formatTokens(d.summary.prompt_tokens)} · avg ${d.summary.avg_prompt_tokens}`}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Kunlik chat xarajati</h2>
          <p className="mt-1 text-sm text-muted-foreground">USD va so&apos;m — faqat Morf AI chat</p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-[260px]" />
          ) : dailyChart.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="Ma'lumot yo'q"
              description="Tanlangan davrda chat bo'lmagan."
            />
          ) : (
            <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-[260px] w-full">
              <AreaChart data={dailyChart} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillChatCost" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#fillChatCost)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Kunlik xabarlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">AI javoblar soni</p>
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
                <Bar dataKey="turns" fill="var(--color-turns)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Kim chat ishlatyapti</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Xabarlar, token, USD xarajat, suhbatlar soni va obuna
        </p>
        {q.isLoading || !d ? (
          <CardSkeleton className="mt-4 h-40" />
        ) : !d.top_users.length ? (
          <EmptyState
            className="mt-4"
            title="Hali chat user yo'q"
            description="Mijoz Morf AI chatga yozganda shu yerda chiqadi."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead>Obuna</TableHead>
                  <TableHead className="text-right">Suhbat</TableHead>
                  <TableHead className="text-right">Xabar</TableHead>
                  <TableHead className="text-right">Oylik token</TableHead>
                  <TableHead className="text-right">Davr token</TableHead>
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
                    <TableCell>{planBadge(u.plan_code, u.subscription_status)}</TableCell>
                    <TableCell className="text-right tabular-nums">{u.threads}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.turns}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({u.success}/{u.failed})
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTokens(u.token_used_month ?? 0)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {formatTokens(u.token_limit ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatTokens(u.tokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCost(u.cost_usd, u.cost_uzs)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {u.last_at
                        ? (() => {
                            try {
                              return format(parseISO(u.last_at), "dd.MM HH:mm");
                            } catch {
                              return u.last_at;
                            }
                          })()
                        : "—"}
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
          <h2 className="font-heading text-lg font-semibold">So&apos;nggi suhbatlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            DB dagi chat history — ochib to&apos;liq transcriptni ko&apos;ring
          </p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-40" />
          ) : !d.recent_threads.length ? (
            <EmptyState className="mt-4" title="Suhbat yo'q" />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Suhbat</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Xabar</TableHead>
                    <TableHead className="text-right">Token</TableHead>
                    <TableHead className="text-right">$</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.recent_threads.map((th) => (
                    <TableRow
                      key={th.db_id}
                      className="cursor-pointer"
                      onClick={() => setThreadId(th.db_id)}
                    >
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{th.title || "Suhbat"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {th.preview || "—"}
                          </p>
                          {th.has_context ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Kontekst: {th.context_keys.slice(0, 4).join(", ") || "bor"}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{th.user_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{th.message_count}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTokens(th.total_tokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatUsd(th.total_cost_usd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
          <h2 className="font-heading text-lg font-semibold">So&apos;nggi AI chaqiruvlar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Prompt, token, latency, status</p>
          {q.isLoading || !d ? (
            <CardSkeleton className="mt-4 h-40" />
          ) : !d.recent.length ? (
            <EmptyState className="mt-4" title="Chaqiruv yo'q" />
          ) : (
            <div className="mt-4 space-y-3">
              {d.recent.slice(0, 12).map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.user_name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {row.prompt || row.error_detail || "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant={row.status === "success" ? "secondary" : "destructive"}>
                        {row.status}
                      </Badge>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {formatTokens(row.total_tokens)} · {formatUsd(row.cost_usd)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Activity className="size-3" />
                      {row.latency_ms} ms
                    </span>
                    <span>
                      prompt {row.prompt_tokens} / out {row.candidates_tokens}
                    </span>
                    {row.model ? <span>{row.model}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={threadId != null} onOpenChange={(open) => !open && setThreadId(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{threadDetail?.title || "Suhbat"}</DialogTitle>
            <DialogDescription>
              {threadDetail
                ? `${threadDetail.user_name}${threadDetail.user_phone ? ` · ${threadDetail.user_phone}` : ""} · ${threadDetail.message_count} xabar · ${formatTokens(threadDetail.total_tokens)} token · ${formatUsd(threadDetail.total_cost_usd)}`
                : "Yuklanmoqda…"}
            </DialogDescription>
          </DialogHeader>
          {threadQ.isLoading ? (
            <CardSkeleton className="h-40" />
          ) : threadDetail ? (
            <div className="space-y-4">
              {Object.keys(threadDetail.context || {}).length > 0 ? (
                <div className="rounded-xl border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Kontekst
                  </p>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(threadDetail.context, null, 2)}
                  </pre>
                </div>
              ) : null}
              <div className="space-y-3">
                {threadDetail.messages.map((m) => (
                  <div
                    key={m.db_id}
                    className={cn(
                      "rounded-xl px-3 py-2.5 text-sm",
                      m.role === "user"
                        ? "ml-6 bg-primary/10 text-foreground"
                        : "mr-6 border border-border bg-card",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="font-medium uppercase">
                        {m.role === "user" ? "User" : "Morf AI"}
                      </span>
                      {m.role === "assistant" && m.total_tokens > 0 ? (
                        <span className="tabular-nums">
                          {formatTokens(m.total_tokens)} · {formatUsd(m.cost_usd)}
                        </span>
                      ) : null}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Suhbat topilmadi" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
