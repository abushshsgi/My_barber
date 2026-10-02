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

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} nusxa olindi`),
    () => toast.error("Nusxa olinmadi"),
  );
}

function IdCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const text = value.trim() ? value : "—";
  return (
    <div className="rounded-xl border border-border/80 bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {text !== "—" ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-foreground underline-offset-2 hover:underline"
            onClick={() => copyText(label, text)}
          >
            Nusxa
          </button>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 break-all font-mono text-foreground",
          strong ? "text-base font-bold sm:text-lg" : "text-xs font-semibold",
        )}
      >
        {text}
      </p>
    </div>
  );
}

function AdminWalletDepositsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("claimed");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<AdminCardDeposit | null>(null);
  const [note, setNote] = useState("");

  const listQ = useQuery({
    queryKey: ["admin", "wallet-deposits", status, search],
    queryFn: () =>
      fetchAdminCardDeposits({
        status: status || undefined,
        q: search || undefined,
      }),
    refetchInterval: 5_000,
  });

  const approveM = useMutation({
    mutationFn: (row: AdminCardDeposit) =>
      approveAdminCardDeposit(row.id, note.trim() || "Bank o'tkazma OK"),
    onSuccess: () => {
      toast.success("Tasdiqlandi — pul hamyonga tushdi");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet-deposits"] });
      setReceiptPreview(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectM = useMutation({
    mutationFn: (row: AdminCardDeposit) =>
      rejectAdminCardDeposit(row.id, note.trim() || "O'tkazma topilmadi / noto'g'ri summa"),
    onSuccess: () => {
      toast.success("Rad etildi");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet-deposits"] });
      setReceiptPreview(null);
      setNote("");
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
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Bank izohidagi kodni shu yerdagi izoh kodi bilan solishtiring. Kod, foydalanuvchi va summa bir xil bo'lsa tasdiqlang.
            {pendingCount > 0 ? ` · ${pendingCount} ta tekshiruvda` : ""}
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
            placeholder="Izoh, merchant, user ID, hamyon, depozit ID…"
            className="w-64 sm:w-80"
          />
          <Button type="submit" variant="secondary">
            Qidirish
          </Button>
        </form>
      </div>

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tasdiq yoki rad izohi — bo'sh qoldirsangiz standart matn yoziladi"
        className="max-w-xl"
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {listQ.isError ? (
          <div className="p-8">
            <EmptyState
              title="Ro'yxat yuklanmadi"
              description={listQ.error instanceof Error ? listQ.error.message : "Qayta urinib ko'ring."}
            />
          </div>
        ) : listQ.isLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="So'rovlar yo'q"
              description="Tanlangan filtrda karta to'ldirish so'rovlari topilmadi."
            />
          </div>
        ) : (
          <div className="grid gap-3 p-3 sm:p-4">
            {rows.map((row) => {
              const code = row.comment_code || row.transaction_ref;
              return (
                <article
                  key={row.id}
                  className="overflow-hidden rounded-2xl border border-border bg-background/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <Link
                        to="/admin/users/$userId"
                        params={{ userId: String(row.user.id) }}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {row.user.full_name || row.user.phone || `User #${row.user.id}`}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {row.user.phone || "—"}
                        {row.user.email ? ` · ${row.user.email}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">{formatAdminUzs(row.amount)}</p>
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            row.status === "claimed" && "bg-amber-500/15 text-amber-900",
                            row.status === "awaiting_payment" && "bg-sky-500/15 text-sky-900",
                            row.status === "approved" && "bg-emerald-500/15 text-emerald-800",
                            row.status === "rejected" && "bg-destructive/10 text-destructive",
                            row.status === "expired" && "bg-muted text-muted-foreground",
                          )}
                        >
                          {STATUS_LABEL[row.status] || row.status}
                        </Badge>
                        {row.wallet_frozen ? (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                            Hamyon muzlatilgan
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="flex flex-col gap-2">
                      {row.receipt_url ? (
                        <button
                          type="button"
                          onClick={() => setReceiptPreview(row)}
                          className="overflow-hidden rounded-xl border border-border bg-muted/40"
                        >
                          <img
                            src={row.receipt_url}
                            alt={`Chek ${code}`}
                            className="h-44 w-full object-cover"
                          />
                        </button>
                      ) : (
                        <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                          Chek hali yo'q
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Yaratilgan {formatWhen(row.created_at)}
                        {row.claimed_at ? ` · Chek ${formatWhen(row.claimed_at)}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Hamyon balansi {formatAdminUzs(row.wallet_balance)}
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <IdCell label="Izoh kodi" value={code} strong />
                      <IdCell label="Merchant" value={row.merchant_ref} strong />
                      <IdCell label="Depozit ID" value={row.id} />
                      <IdCell label="User ID" value={row.user.id ? String(row.user.id) : ""} />
                      <IdCell label="Hamyon raqami" value={row.wallet_number} />
                      <IdCell label="Hamyon ID" value={row.wallet_id ? String(row.wallet_id) : ""} />
                      <IdCell label="Ledger ID" value={row.ledger_entry_id || ""} />
                      <IdCell label="Ledger hash" value={row.ledger_entry_hash} />
                      <IdCell label="Idempotency" value={row.idempotency_key} />
                      <IdCell label="IP" value={row.client_ip || ""} />
                    </div>
                  </div>

                  {row.status === "claimed" || row.status === "awaiting_payment" ? (
                    <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:justify-end">
                      <div className="flex gap-2">
                        {row.status === "claimed" ? (
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
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approveM.isPending || rejectM.isPending}
                          onClick={() => rejectM.mutate(row)}
                        >
                          {row.status === "awaiting_payment" ? "Bekor qilish" : "Rad etish"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={!!receiptPreview}
        onOpenChange={(open) => {
          if (!open) setReceiptPreview(null);
        }}
      >
        <DialogContent className="max-w-lg sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chek va identifikatorlar</DialogTitle>
            <DialogDescription>
              {receiptPreview
                ? `${receiptPreview.user.full_name || receiptPreview.user.phone || "User"} · ${formatAdminUzs(receiptPreview.amount)} · ${STATUS_LABEL[receiptPreview.status] || receiptPreview.status}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {receiptPreview ? (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              {receiptPreview.receipt_url ? (
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
              <div className="grid content-start gap-2">
                <IdCell label="Izoh kodi" value={receiptPreview.comment_code || receiptPreview.transaction_ref} strong />
                <IdCell label="Merchant" value={receiptPreview.merchant_ref} />
                <IdCell label="Depozit ID" value={receiptPreview.id} />
                <IdCell label="User ID" value={String(receiptPreview.user.id || "")} />
                <IdCell label="Hamyon" value={receiptPreview.wallet_number} />
              </div>
            </div>
          ) : null}
          {receiptPreview && receiptPreview.status === "claimed" ? (
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
