import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
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
  adminDepositChannelLabel,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/deposits-overdue")({
  component: AdminOverdueDepositsPage,
});

const OPEN_REVIEW = new Set(["claimed", "expired"]);
const PAGE_SIZE = 8;

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

function waitingLabel(iso: string | null | undefined) {
  if (!iso) return "24 soatdan oshgan";
  const hours = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 48) return `${hours} soat kutmoqda`;
  return `${Math.floor(hours / 24)} kun kutmoqda`;
}

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} nusxa olindi`),
    () => toast.error("Nusxa olinmadi"),
  );
}

function AdminOverdueDepositsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<AdminCardDeposit | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminCardDeposit | null>(null);
  const [approveStep, setApproveStep] = useState<1 | 2>(1);
  const [confirmCode, setConfirmCode] = useState("");

  const listQ = useQuery({
    queryKey: ["admin", "wallet-deposits", "overdue", search, page],
    queryFn: () =>
      fetchAdminCardDeposits({
        overdue: true,
        q: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
    refetchInterval: 12_000,
  });

  const approveM = useMutation({
    mutationFn: (row: AdminCardDeposit) =>
      approveAdminCardDeposit(row.id, note.trim() || "Bank o'tkazma OK", confirmCode.trim()),
    onSuccess: () => {
      toast.success("Tasdiqlandi — pul hamyonga tushdi");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet-deposits"] });
      setReceiptPreview(null);
      setApproveTarget(null);
      setApproveStep(1);
      setConfirmCode("");
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

  function askApprove(row: AdminCardDeposit) {
    if (!row.receipt_url) {
      toast.error("Chek yuklanmagan");
      return;
    }
    if (row.wallet_frozen) {
      toast.error("Hamyon muzlatilgan. Avval oching.");
      return;
    }
    setApproveTarget(row);
    setApproveStep(1);
    setConfirmCode("");
  }

  const expectedCode = (approveTarget?.transaction_ref || "").replace(/\s/g, "").toUpperCase();
  const typedCode = confirmCode.replace(/\s/g, "").toUpperCase();
  const codeMatches = typedCode.length > 0 && typedCode === expectedCode;
  const rows = listQ.data?.results ?? [];
  const total = listQ.data?.count ?? rows.length;

  useEffect(() => {
    const pages = listQ.data?.total_pages ?? 1;
    if (page > pages) setPage(pages);
  }, [listQ.data?.total_pages, page]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link
          to="/admin/finance/deposits"
          className="text-sm font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Karta to'ldirish
        </Link>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground">
          Kechikkan cheklar
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Foydalanuvchi chek yuborgan, lekin 24 soat ichida tasdiqlanmagan so'rovlar. Ular shu yerda
          qoladi — tasdiqlanguncha yoki rad etilguncha yo'qolmaydi. Pul hali hamyonga tushmagan.
          {total > 0 ? ` · jami ${total} ta, sahifada ${PAGE_SIZE} tadan` : ""}
        </p>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Izoh, telefon, ism, hamyon…"
          className="w-64 sm:w-80"
        />
        <Button type="submit" variant="secondary">
          Qidirish
        </Button>
      </form>

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
              description={
                listQ.error instanceof Error ? listQ.error.message : "Qayta urinib ko'ring."
              }
            />
          </div>
        ) : listQ.isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Kechikkan chek yo'q"
              description="24 soatdan oshgan, hali tasdiqlanmagan cheklar shu yerda chiqadi."
            />
          </div>
        ) : (
          <div className="grid gap-3 p-3 sm:p-4">
            {rows.map((row) => {
              const code = row.comment_code || row.transaction_ref;
              const canReview = OPEN_REVIEW.has(row.status);
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
                        {row.user.email && !row.user.email.endsWith("@phone.mysaloon.local")
                          ? ` · ${row.user.email}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums">
                        {formatAdminUzs(row.amount)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
                        <Badge variant="secondary" className="bg-amber-500/15 text-amber-900">
                          {waitingLabel(row.claimed_at)}
                        </Badge>
                        <Badge variant="secondary">{adminDepositChannelLabel(row)}</Badge>
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
                            loading="lazy"
                            className="h-44 w-full bg-muted/30 object-contain"
                          />
                        </button>
                      ) : (
                        <p className="rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
                          Chek yo'q
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Chek {formatWhen(row.claimed_at)}
                      </p>
                    </div>
                    <div className="grid content-start gap-2 sm:grid-cols-2">
                      <CodeCell label="Izoh kodi" value={code} strong />
                      <CodeCell label="Merchant" value={row.merchant_ref} strong />
                      <CodeCell label="Hamyon raqami" value={row.wallet_number} />
                      <CodeCell label="User ID" value={row.user.id ? String(row.user.id) : ""} />
                    </div>
                  </div>

                  {canReview ? (
                    <div className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveM.isPending || rejectM.isPending}
                        onClick={() => rejectM.mutate(row)}
                      >
                        Rad etish
                      </Button>
                      <Button
                        size="sm"
                        disabled={approveM.isPending || rejectM.isPending}
                        onClick={() => askApprove(row)}
                      >
                        Tasdiqlash
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
        {total > 0 ? (
          <Pagination
            page={listQ.data?.page || page}
            totalPages={listQ.data?.total_pages || 1}
            count={total}
            pageSize={listQ.data?.page_size || PAGE_SIZE}
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Dialog open={!!receiptPreview} onOpenChange={(open) => !open && setReceiptPreview(null)}>
        <DialogContent className="max-w-lg sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chek</DialogTitle>
            <DialogDescription>
              {receiptPreview
                ? `${receiptPreview.user.full_name || receiptPreview.user.phone || "User"} · ${formatAdminUzs(receiptPreview.amount)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {receiptPreview?.receipt_url ? (
            <a href={receiptPreview.receipt_url} target="_blank" rel="noreferrer" className="block">
              <img
                src={receiptPreview.receipt_url}
                alt="Chek"
                className="max-h-[60vh] w-full rounded-xl border border-border object-contain"
              />
            </a>
          ) : null}
          {receiptPreview && OPEN_REVIEW.has(receiptPreview.status) ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={approveM.isPending || rejectM.isPending}
                onClick={() => rejectM.mutate(receiptPreview)}
              >
                Rad etish
              </Button>
              <Button
                disabled={approveM.isPending || rejectM.isPending}
                onClick={() => askApprove(receiptPreview)}
              >
                Tasdiqlash
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open && !approveM.isPending) {
            setApproveTarget(null);
            setApproveStep(1);
            setConfirmCode("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approveStep === 1 ? "Tasdiqlashni boshlaysizmi?" : "Izoh kodini qayta kiriting"}
            </DialogTitle>
            <DialogDescription>
              {approveTarget
                ? `${approveTarget.user.full_name || approveTarget.user.phone || "User"} · ${formatAdminUzs(approveTarget.amount)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {approveStep === 1 ? (
            <p className="text-sm text-muted-foreground">
              24 soat o'tgan bo'lsa ham tasdiqlash mumkin. Pul foydalanuvchi hamyoniga tushadi.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Chekdagi izoh kodini shu yerga yozing.
              </p>
              <Input
                value={confirmCode}
                autoFocus
                autoComplete="off"
                placeholder="Izoh kodi"
                onChange={(e) => setConfirmCode(e.target.value)}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={approveM.isPending}
              onClick={() => {
                if (approveStep === 2) {
                  setApproveStep(1);
                  setConfirmCode("");
                  return;
                }
                setApproveTarget(null);
              }}
            >
              {approveStep === 2 ? "Orqaga" : "Bekor"}
            </Button>
            {approveStep === 1 ? (
              <Button onClick={() => setApproveStep(2)}>Davom etish</Button>
            ) : (
              <Button
                disabled={!codeMatches || approveM.isPending || !approveTarget}
                onClick={() => {
                  if (approveTarget) approveM.mutate(approveTarget);
                }}
              >
                Tasdiqlash
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CodeCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const text = value.trim() ? value : "—";
  return (
    <div className="rounded-xl border border-border/80 bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
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
          strong ? "text-base font-bold" : "text-xs font-semibold",
        )}
      >
        {text}
      </p>
    </div>
  );
}
