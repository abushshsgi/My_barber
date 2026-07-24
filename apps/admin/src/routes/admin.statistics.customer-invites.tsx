import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Search, UserPlus, Users, Send, Trophy } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  fetchAdminCustomerInviteLeaderboard,
  fetchAdminCustomerInviteList,
  fetchAdminCustomerInviteStats,
} from "@/lib/admin-api";

export const Route = createFileRoute("/admin/statistics/customer-invites")({
  component: StatisticsCustomerInvitesPage,
});

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function sourceLabel(code: string) {
  if (code === "outreach") return "Outreach";
  if (code === "manual_code") return "Kod";
  return "Havola";
}

function StatisticsCustomerInvitesPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const statsQ = useQuery({
    queryKey: ["admin", "customer-invite-stats"],
    queryFn: () => fetchAdminCustomerInviteStats(30),
    refetchInterval: 30_000,
  });

  const listQ = useQuery({
    queryKey: ["admin", "customer-invites", search],
    queryFn: () => fetchAdminCustomerInviteList({ q: search || undefined, page: 1 }),
  });

  const boardQ = useQuery({
    queryKey: ["admin", "customer-invite-leaderboard"],
    queryFn: () => fetchAdminCustomerInviteLeaderboard({ only_with_invites: true, page: 1 }),
  });

  const d = statsQ.data;
  const chartData =
    d?.by_day.map((row) => ({
      day: row.day ? row.day.slice(5) : "—",
      count: row.count,
    })) ?? [];

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Mijoz chaqirishlari"
        description="Sartarosh va go‘zallik salonlari o‘z mijozlarini MySaloon’ga chaqirishi — kim, qachon, nechta."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statsQ.isLoading || !d ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="min-h-[110px]" />)
        ) : (
          <>
            <KPICard
              label="Jami qo‘shilgan"
              value={String(d.total_invites)}
              icon={UserPlus}
              hint={`Oxirgi ${d.period_days} kunda ${d.invites_in_period}`}
            />
            <KPICard
              label="Faol sartaroshlar"
              value={String(d.barbers_with_invites)}
              icon={Trophy}
              hint="Kamida 1 ta mijoz chaqirgan"
            />
            <KPICard
              label="Outreach yozuvlari"
              value={String(d.outreach_total)}
              icon={Send}
              hint={`Kutilmoqda: ${d.outreach_pending}`}
            />
            <KPICard
              label="Top chaqiruvchi"
              value={d.top_barbers[0] ? String(d.top_barbers[0].invite_count) : "0"}
              icon={Users}
              hint={d.top_barbers[0]?.full_name || d.top_barbers[0]?.email || "—"}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Kunlik qo‘shilishlar (30 kun)</h3>
          {statsQ.isLoading || !d ? (
            <CardSkeleton className="min-h-[220px]" />
          ) : chartData.length === 0 ? (
            <EmptyState title="Ma’lumot yo‘q" />
          ) : (
            <ChartContainer
              config={{ count: { label: "Qo‘shilgan", color: "hsl(var(--chart-1))" } }}
              className="h-[220px] w-full"
            >
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Eng ko‘p chaqirganlar</h3>
          {boardQ.isLoading ? (
            <TableSkeleton rows={5} />
          ) : !boardQ.data?.results.length ? (
            <EmptyState title="Hali reyting yo‘q" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sartarosh</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead className="text-right">Mijoz</TableHead>
                  <TableHead className="text-right">Outreach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boardQ.data.results.slice(0, 15).map((row) => (
                  <TableRow key={row.barber_id}>
                    <TableCell>
                      <Link
                        to="/admin/barbers/$barberId"
                        params={{ barberId: String(row.barber_id) }}
                        className="font-medium hover:underline"
                      >
                        {row.full_name || row.email}
                      </Link>
                      <div className="text-xs text-muted-foreground">{row.email}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.invite_code || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.invite_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.outreach_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Barcha chaqirilgan mijozlar</h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(q.trim());
            }}
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ism, telefon, sartarosh…"
                className="pl-8 w-64"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-foreground text-background px-3 text-sm font-medium"
            >
              Qidirish
            </button>
          </form>
        </div>
        {listQ.isLoading ? (
          <TableSkeleton rows={8} />
        ) : !listQ.data?.results.length ? (
          <EmptyState title="Yozuvlar topilmadi" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mijoz</TableHead>
                <TableHead>Sartarosh</TableHead>
                <TableHead>Manba</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead>Vaqt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQ.data.results.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: String(row.customer.id) }}
                      className="font-medium hover:underline"
                    >
                      {row.customer.full_name}
                    </Link>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {row.customer.phone || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/admin/barbers/$barberId"
                      params={{ barberId: String(row.barber.id) }}
                      className="hover:underline"
                    >
                      {row.barber.full_name || row.barber.email}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{sourceLabel(row.source)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.code_used}</TableCell>
                  <TableCell className="text-xs tabular-nums">{fmtDate(row.joined_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {listQ.data ? (
          <p className="text-xs text-muted-foreground">Jami: {listQ.data.count}</p>
        ) : null}
      </div>
    </div>
  );
}
