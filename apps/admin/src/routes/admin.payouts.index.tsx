import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchPayouts,
  markPayoutPaid,
  rejectPayout,
  PAGE_SIZE,
} from "@/lib/admin-api";
import { formatAdminUzs, formatAdminUzsFull } from "@/lib/admin-analytics";
import { LiveMoneyHero } from "@/components/admin/LiveMoneyHero";
import { KPICard } from "@/components/admin/KPICard";
import { Pagination } from "@/components/admin/Pagination";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/payouts/")({
  component: AdminPayoutsPage,
});

const STATUS_FILTERS = [
  { id: "pending", label: "Kutilmoqda" },
  { id: "paid", label: "To'langan" },
  { id: "failed", label: "Rad etilgan" },
  { id: "all", label: "Hammasi" },
] as const;

function AdminPayoutsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("pending");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const listQ = useQuery({
    queryKey: ["admin", "payouts", status, search, page],
    queryFn: () => fetchPayouts({ status, q: search || undefined, page }),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });

  const payMut = useMutation({
    mutationFn: markPayoutPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast.success("Yechish to'landi deb belgilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: rejectPayout,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "payouts"] });
      toast.success("So'rov rad etildi — balans qayta ochiq");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = listQ.data?.results ?? [];
  const summary = listQ.data?.summary;
  const pag = listQ.data;

  const applySearch = () => {
    setSearch(q.trim());
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Sartarosh yechishlari (Payout)
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Sartaroshlar platformadan pul yechish so&apos;rovi yuboradi. Bu yerda kim, qachon, qancha
          so&apos;ragani, hisob ma&apos;lumotlari va to&apos;lov holati ko&apos;rinadi. Bu platforma
          daromadi emas — sartaroshga chiqariladigan pul.
        </p>
      </div>

      {listQ.isLoading && !summary ? (
        <CardSkeleton className="min-h-[180px]" />
      ) : (
        <LiveMoneyHero
          label="Kutilayotgan yechishlar"
          valueUzs={summary?.pending_total ?? 0}
          icon={Banknote}
          accent="amber"
          sublabel={`${summary?.pending_count ?? 0} ta so'rov admin tasdig'ini kutmoqda · 10 soniyada yangilanadi`}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {!summary ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard
              label="Kutilmoqda"
              value={formatAdminUzs(summary.pending_total)}
              icon={Clock3}
              hint={`${summary.pending_count} ta`}
            />
            <KPICard
              label="To'langan"
              value={formatAdminUzs(summary.paid_total)}
              icon={CheckCircle2}
              hint={`${summary.paid_count} ta`}
            />
            <KPICard
              label="Rad etilgan"
              value={formatAdminUzs(summary.failed_total)}
              icon={XCircle}
              hint={`${summary.failed_count} ta`}
            />
            <KPICard
              label="Jami so'rovlar"
              value={formatAdminUzsFull(summary.all_total)}
              hint={`${summary.all_count} ta · barcha holatlar`}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-end">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applySearch();
            }}
            placeholder="Sartarosh, telefon, hisob..."
            className="pl-9"
          />
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setStatus(f.id);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                status === f.id
                  ? "bg-background font-medium text-foreground shadow-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button type="button" onClick={applySearch}>
          Qidirish
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {listQ.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : listQ.isError ? (
          <EmptyState
            title="Yuklanmadi"
            description="Yechish so'rovlarini olishning iloji bo'lmadi."
            className="py-12"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="So'rov yo'q"
            description="Tanlangan filtr bo'yicha yechish so'rovi topilmadi."
            className="py-12"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-background text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium sm:px-6">Sartarosh</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Summa</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Hisob</th>
                    <th className="px-4 py-3 font-medium sm:px-6">So&apos;ralgan</th>
                    <th className="px-4 py-3 font-medium sm:px-6">To&apos;langan</th>
                    <th className="px-4 py-3 font-medium sm:px-6">Holat</th>
                    <th className="px-4 py-3 font-medium sm:px-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((p) => (
                    <tr key={p.id} className="hover:bg-background/50">
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          {p.barber_avatar ? (
                            <img
                              src={p.barber_avatar}
                              alt=""
                              className="size-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-9 rounded-full bg-muted" />
                          )}
                          <div className="min-w-0">
                            {p.barber_id ? (
                              <Link
                                to="/admin/barbers/$barberId"
                                params={{ barberId: p.barber_id }}
                                className="font-medium text-foreground hover:underline"
                              >
                                {p.barber_name || "—"}
                              </Link>
                            ) : (
                              <div className="font-medium">{p.barber_name || "—"}</div>
                            )}
                            {p.barber_phone ? (
                              <div className="text-xs text-muted-foreground">{p.barber_phone}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="tabular-nums text-base font-semibold">
                          {formatAdminUzsFull(p.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">Davr: {p.period || "—"}</div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <div className="text-sm font-medium">
                          {p.payout_holder_name || p.reference || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[p.payout_bank_name, p.payout_account_last4 ? `****${p.payout_account_last4}` : ""]
                            .filter(Boolean)
                            .join(" · ") || "Hisob ko'rsatilmagan"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs tabular-nums text-muted-foreground sm:px-6">
                        {p.created_at
                          ? format(new Date(p.created_at), "dd MMM yyyy HH:mm")
                          : "—"}
                      </td>
                      <td className="px-4 py-4 text-xs tabular-nums text-muted-foreground sm:px-6">
                        {p.paid_at
                          ? format(new Date(p.paid_at), "dd MMM yyyy HH:mm")
                          : "—"}
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <StatusBadge
                          status={
                            p.status === "paid"
                              ? "completed"
                              : p.status === "failed"
                                ? "cancelled"
                                : "pending"
                          }
                          label={
                            p.status === "paid"
                              ? "To'langan"
                              : p.status === "failed"
                                ? "Rad etilgan"
                                : "Kutilmoqda"
                          }
                        />
                      </td>
                      <td className="px-4 py-4 text-right sm:px-6">
                        {p.status === "pending" ? (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (
                                  confirm(
                                    `${p.barber_name} ga ${formatAdminUzsFull(p.amount)} to'langan deb belgilansinmi?`,
                                  )
                                ) {
                                  payMut.mutate(p.id);
                                }
                              }}
                              disabled={payMut.isPending || rejectMut.isPending}
                            >
                              To&apos;lash
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm("So'rov rad etilsinmi? Balans qayta ochiladi.")) {
                                  rejectMut.mutate(p.id);
                                }
                              }}
                              disabled={payMut.isPending || rejectMut.isPending}
                            >
                              Rad etish
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pag ? (
              <Pagination
                page={pag.page}
                totalPages={pag.total_pages}
                count={pag.count}
                pageSize={pag.page_size || PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
