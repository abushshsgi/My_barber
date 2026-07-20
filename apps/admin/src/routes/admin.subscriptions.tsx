import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Repeat, Search, Sparkles, Users, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  fetchAdminSubscriptionStats,
  fetchAdminSubscriptions,
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

function AdminSubscriptionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPlan, setGrantPlan] = useState("plus");
  const [grantDays, setGrantDays] = useState("30");

  const statsQ = useQuery({
    queryKey: ["admin", "subscriptions", "stats"],
    queryFn: fetchAdminSubscriptionStats,
  });

  const listQ = useQuery({
    queryKey: ["admin", "subscriptions", "list", status, search],
    queryFn: () => fetchAdminSubscriptions({ status: status || undefined, q: search || undefined }),
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

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">B2C Obunalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Morph AI rejalari, to'lovlar, limitlar va referal sinovlar.
        </p>
      </div>

      {statsQ.isLoading ? (
        <CardSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard label="Faol obuna" value={String(stats.active_count)} icon={Repeat} />
          <KPICard
            label="Daromad (to'langan)"
            value={formatAdminUzs(stats.revenue_uzs)}
            icon={Wallet}
          />
          <KPICard
            label="Referal sinov"
            value={String(stats.referral_trials_granted)}
            icon={Users}
          />
          <KPICard
            label="Morph AI foydalanish"
            value={String(stats.usage_totals.morph_ai)}
            icon={Sparkles}
          />
        </div>
      ) : null}

      {stats ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-heading text-base font-semibold">Reja bo'yicha</h2>
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
            <h2 className="font-heading text-base font-semibold">Manba</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {stats.by_source.map((s) => (
                <li key={s.source} className="flex justify-between">
                  <span>{s.source}</span>
                  <span className="font-semibold">{s.count}</span>
                </li>
              ))}
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
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-lg font-semibold">Obunalar ro'yxati</h2>
          <div className="flex flex-wrap gap-2">
            {["active", "expired", "deactivated", "cancelled", ""].map((s) => (
              <button
                key={s || "all"}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  status === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
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
                  <TableHead>Limit (AI / Studio)</TableHead>
                  <TableHead>Tugash</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQ.data.results.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.user.full_name || row.user.phone || "—"}</div>
                      <div className="text-xs text-muted-foreground">{row.user.phone}</div>
                    </TableCell>
                    <TableCell className="capitalize">{row.plan_code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{STATUS_LABEL[row.status] || row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {row.usage.morph_ai_used}/{row.usage.morph_ai_limit} ·{" "}
                      {row.usage.morph_studio_used}/{row.usage.morph_studio_limit}
                      <div className="text-muted-foreground">
                        qoldi {row.usage.morph_ai_remaining} / {row.usage.morph_studio_remaining}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.ends_at ? new Date(row.ends_at).toLocaleString("uz-UZ") : "—"}
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

      {stats?.recent_events?.length ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-heading text-lg font-semibold">So'nggi hodisalar</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {stats.recent_events.slice(0, 15).map((ev) => (
              <li key={ev.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <span className="font-medium">{ev.action}</span>
                  <span className="text-muted-foreground"> · {ev.user_name || ev.user_id || "—"}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(ev.created_at).toLocaleString("uz-UZ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
