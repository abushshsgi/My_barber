import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  approveAdminCardDeposit,
  fetchAdminCardDeposits,
  rejectAdminCardDeposit,
  type AdminCardDeposit,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/deposits")({
  component: AdminWalletDepositsPage,
});

const STATUS_TABS = [
  { id: "claimed", label: "Kutilmoqda" },
  { id: "awaiting_payment", label: "To'lov kutilmoqda" },
  { id: "approved", label: "Tasdiqlangan" },
  { id: "rejected", label: "Rad etilgan" },
  { id: "", label: "Hammasi" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "To'lov kutilmoqda",
  claimed: "Tekshiruvda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  expired: "Muddati o'tgan",
  cancelled: "Bekor",
};

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

function AdminWalletDepositsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("claimed");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<AdminCardDeposit | null>(null);

  const listQ = useQuery({
    queryKey: ["admin", "wallet-deposits", status, search],
    queryFn: () =>
      fetchAdminCardDeposits({
        status: status || undefined,
        q: search || undefined,
      }),
    refetchInterval: 15_000,
  });

  const approveM = useMutation({
    mutationFn: (row: AdminCardDeposit) => approveAdminCardDeposit(row.id, "Bank o'tkazma OK"),
    onSuccess: () => {
      toast.success("Tasdiqlandi — pul hamyonga tushdi");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet-deposits"] });
      setReceiptPreview(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectM = useMutation({
    mutationFn: (row: AdminCardDeposit) =>
      rejectAdminCardDeposit(row.id, "O'tkazma topilmadi / noto'g'ri summa"),
    onSuccess: () => {
      toast.success("Rad etildi");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet-deposits"] });
      setReceiptPreview(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = listQ.data?.results ?? [];
  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === "claimed").length,
    [rows],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Karta to'ldirishlar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chek rasmini tekshiring — to'g'ri bo'lsa tasdiqlang, aks holda rad eting.
            {pendingCount > 0 ? ` · ${pendingCount} ta kutilmoqda` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id || "all"}
            type="button"
            onClick={() => setStatus(tab.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              status === tab.id
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tranzaksiya / telefon / ism…"
            className="w-56"
          />
          <Button type="submit" variant="secondary">
            Qidirish
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {listQ.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="So'rovlar yo'q"
              description="Tanlangan filtrda karta to'ldirish so'rovlari topilmadi."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Tranzaksiya</th>
                  <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                  <th className="px-4 py-3 font-medium text-right">Summa</th>
                  <th className="px-4 py-3 font-medium">Chek</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Vaqt</th>
                  <th className="px-4 py-3 font-medium text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-background/50">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold tracking-wide">
                        {row.transaction_ref}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Merchant · {row.merchant_ref}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        IP · {row.client_ip || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: String(row.user.id) }}
                        className="font-medium text-foreground hover:underline"
                      >
                        {row.user.full_name || row.user.phone || `User #${row.user.id}`}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.user.phone || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Hamyon · {row.wallet_number}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatAdminUzs(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      {row.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setReceiptPreview(row)}
                          className="group block overflow-hidden rounded-lg border border-border bg-muted/40 transition-opacity hover:opacity-90"
                        >
                          <img
                            src={row.receipt_url}
                            alt={`Chek ${row.transaction_ref}`}
                            className="h-16 w-14 object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Yo'q</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          row.status === "claimed" && "bg-amber-500/15 text-amber-900",
                          row.status === "approved" && "bg-emerald-500/15 text-emerald-800",
                          row.status === "rejected" && "bg-destructive/10 text-destructive",
                        )}
                      >
                        {STATUS_LABEL[row.status] || row.status}
                      </Badge>
                      {row.reviewed_by_admin_email ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.reviewed_by_admin_email}
                        </p>
                      ) : null}
                      {row.review_note ? (
                        <p className="mt-0.5 max-w-[180px] text-[11px] text-muted-foreground">
                          {row.review_note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      <p>Yaratilgan · {formatWhen(row.created_at)}</p>
                      <p className="mt-0.5">To'ladim · {formatWhen(row.claimed_at)}</p>
                      <p className="mt-0.5">Tekshiruv · {formatWhen(row.reviewed_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === "claimed" || row.status === "awaiting_payment" ? (
                        <div className="flex flex-col items-end gap-1.5">
                          {row.receipt_url ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setReceiptPreview(row)}
                            >
                              Chekni ko'rish
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            disabled={approveM.isPending || rejectM.isPending}
                            onClick={() => {
                              if (!row.receipt_url) {
                                toast.error("Chek yuklanmagan — avval foydalanuvchi chek yuborsin");
                                return;
                              }
                              approveM.mutate(row);
                            }}
                          >
                            Tasdiqlash
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={approveM.isPending || rejectM.isPending}
                            onClick={() => rejectM.mutate(row)}
                          >
                            Rad etish
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog
        open={!!receiptPreview}
        onOpenChange={(open) => {
          if (!open) setReceiptPreview(null);
        }}
      >
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>To'lov cheki</DialogTitle>
            <DialogDescription>
              {receiptPreview
                ? `${receiptPreview.transaction_ref} · ${formatAdminUzs(receiptPreview.amount)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {receiptPreview?.receipt_url ? (
            <a
              href={receiptPreview.receipt_url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-xl border border-border bg-muted/30"
            >
              <img
                src={receiptPreview.receipt_url}
                alt={`Chek ${receiptPreview.transaction_ref}`}
                className="max-h-[60vh] w-full object-contain"
              />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Chek rasmi yo'q.</p>
          )}
          {receiptPreview &&
          (receiptPreview.status === "claimed" ||
            receiptPreview.status === "awaiting_payment") ? (
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={approveM.isPending || rejectM.isPending}
                onClick={() => rejectM.mutate(receiptPreview)}
              >
                Rad etish
              </Button>
              <Button
                disabled={approveM.isPending || rejectM.isPending || !receiptPreview.receipt_url}
                onClick={() => approveM.mutate(receiptPreview)}
              >
                Tasdiqlash
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
