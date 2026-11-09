import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronDown, Search, Ticket, UserPlus, Users } from "lucide-react";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatsPageHeader } from "@/components/admin/StatisticsShell";
import { Badge } from "@/components/ui/badge";
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
  fetchAdminReferralTryon,
  type AdminReferralTryonRow,
  type ReferralTryonUsage,
} from "@/lib/admin-api";
import { SlideNumber } from "@/components/admin/SlideNumber";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/statistics/referral-tryon")({
  component: ReferralTryonPage,
});

const FILTERS: Array<{ id: "all" | "yes" | "no" | "none"; label: string }> = [
  { id: "all", label: "Hammasi" },
  { id: "yes", label: "Try ishlatgan" },
  { id: "no", label: "Ishlatmagan" },
  { id: "none", label: "Try berilmagan" },
];

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

function usageBadge(usage: ReferralTryonUsage) {
  if (usage === "used") {
    return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Ishlatgan</Badge>;
  }
  if (usage === "unused") {
    return <Badge className="bg-amber-500/15 text-amber-800 hover:bg-amber-500/15">Ishlatmagan</Badge>;
  }
  return <Badge variant="secondary">Try yo'q</Badge>;
}

function ReferralTryonPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [used, setUsed] = useState<"all" | "yes" | "no" | "none">("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const query = useQuery({
    queryKey: ["admin", "referral-tryon", search, used, page],
    queryFn: () => fetchAdminReferralTryon({ q: search || undefined, used, page }),
    placeholderData: keepPreviousData,
  });

  const d = query.data;
  const totalPages = d ? Math.max(1, Math.ceil(d.count / d.page_size)) : 1;

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title="Do'stlar"
        description="Kim nechta do'st chaqirgan, nechta try-on berilgan va u trydan foydalanganmi."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!d ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="min-h-[110px]" />)
        ) : (
          <>
            <KPICard
              label="Chaqiruvchilar"
              value={String(d.summary.referrers)}
              icon={Users}
              hint={`Do'stlar: ${d.summary.friends}`}
            />
            <KPICard
              label="Berilgan try"
              value={String(d.summary.tries_granted)}
              icon={Ticket}
              hint={`Qolgan: ${d.summary.tries_left}`}
            />
            <KPICard
              label="Ishlatilgan try"
              value={String(d.summary.tries_used)}
              icon={UserPlus}
              hint={`${d.summary.referrers_used} kishi ishlatgan`}
            />
            <KPICard
              label="Ishlatmagan"
              value={String(d.summary.referrers_unused)}
              icon={Ticket}
              hint={`Try berilmagan: ${d.summary.referrers_without_try}`}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, telefon yoki email"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setUsed(item.id);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                used === item.id
                  ? "bg-background font-medium shadow-card text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {query.isError ? (
        <EmptyState
          title="Ma'lumotni yuklab bo'lmadi"
          description={query.error instanceof Error ? query.error.message : "Noma'lum xatolik"}
        />
      ) : !d ? (
        <TableSkeleton rows={6} />
      ) : d.results.length === 0 ? (
        <EmptyState title="Hali do'st chaqiruvi yo'q" description="Filtrni yoki qidiruvni o'zgartirib ko'ring." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kim</TableHead>
                <TableHead className="text-right">Do'stlar</TableHead>
                <TableHead className="text-right">Try berilgan</TableHead>
                <TableHead className="text-right">Ishlatilgan</TableHead>
                <TableHead className="text-right">Qolgan</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.results.map((row) => (
                <ReferrerRows
                  key={row.user_id}
                  row={row}
                  open={openId === row.user_id}
                  onToggle={() => setOpenId((id) => (id === row.user_id ? null : row.user_id))}
                />
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
            <span className="text-muted-foreground">{d.count} ta chaqiruvchi</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Oldingi
              </button>
              <span className="tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40"
              >
                Keyingi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferrerRows({
  row,
  open,
  onToggle,
}: {
  row: AdminReferralTryonRow;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <div className="flex items-start gap-2">
            <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
            <div className="min-w-0">
              <Link
                to="/admin/users/$userId"
                params={{ userId: String(row.user_id) }}
                className="font-medium hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {row.full_name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">{row.phone || row.email || "—"}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right tabular-nums"><SlideNumber value={row.friends_count} /></TableCell>
        <TableCell className="text-right tabular-nums"><SlideNumber value={row.tries_granted} /></TableCell>
        <TableCell className="text-right tabular-nums"><SlideNumber value={row.tries_used} /></TableCell>
        <TableCell className="text-right tabular-nums"><SlideNumber value={row.tries_left} /></TableCell>
        <TableCell>{usageBadge(row.usage)}</TableCell>
      </TableRow>
      {open ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="bg-muted/30 p-0">
            {row.friends.length === 0 ? (
              <p className="px-6 py-4 text-sm text-muted-foreground">Do'stlar ro'yxati bo'sh</p>
            ) : (
              <ul className="divide-y divide-border">
                {row.friends.map((friend) => (
                  <li key={friend.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: String(friend.id) }}
                        className="text-sm font-medium hover:underline"
                      >
                        {friend.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{friend.phone || friend.email || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{fmtDate(friend.joined_at)}</span>
                      {friend.try_granted ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">1 try berilgan</Badge>
                      ) : (
                        <Badge variant="secondary">Try berilmagan</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
