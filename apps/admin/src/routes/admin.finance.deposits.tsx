import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
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

const PAGE_SIZE = 20;

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

function publicEmail(email: string | null | undefined) {
  const value = (email || "").trim();
  if (!value || value.endsWith("@phone.mysaloon.local")) return "";
  return value;
}

function statusBadgeClass(status: string) {
  return cn(
    status === "claimed" && "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    status === "awaiting_payment" && "bg-sky-500/15 text-sky-900 dark:text-sky-200",
    status === "approved" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    status === "rejected" && "bg-destructive/10 text-destructive",
    status === "expired" && "bg-muted text-muted-foreground",
  );
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
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<AdminCardDeposit | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState("");
  const [rejectTarget, setRejectTarget] = useState<AdminCardDeposit | null>(null);
  const [approveTarget, setApproveTarget] = useState<AdminCardDeposit | null>(null);
  const [approveStep, setApproveStep] = useState<1 | 2>(1);
  const [confirmCode, setConfirmCode] = useState("");

  const listQ = useQuery({
    queryKey: ["admin", "wallet-deposits", status, search, page],
    queryFn: () =>
      fetchAdminCardDeposits({
        status: status || undefined,
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
      setRejectTarget(null);
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function askReject(row: AdminCardDeposit) {
    setReceiptPreview(null);
    setRejectTarget(row);
    setNote("");
  }

  function askApprove(row: AdminCardDeposit) {
    if (!row.receipt_url) {
      toast.error("Chek yuklanmagan — avval foydalanuvchi chek yuborsin");
      return;
    }
    if (row.wallet_frozen) {
      toast.error("Hamyon muzlatilgan. Avval oching.");
      return;
    }
    setReceiptPreview(null);
    setApproveTarget(row);
    setApproveStep(1);
    setConfirmCode("");
    setNote("");
  }

  const expectedCode = (approveTarget?.transaction_ref || "").replace(/\s/g, "").toUpperCase();
  const typedCode = confirmCode.replace(/\s/g, "").toUpperCase();
  const codeMatches = typedCode.length > 0 && typedCode === expectedCode;

  const rows = listQ.data?.results ?? [];
  const counts = listQ.data?.counts ?? {};
  const total = listQ.data?.count ?? rows.length;
  const pendingCount = counts.claimed ?? 0;

  useEffect(() => {
    const pages = listQ.data?.total_pages ?? 1;
    if (page > pages) setPage(pages);
  }, [listQ.data?.total_pages, page]);

  useEffect(() => {
    const next = q.trim();
    const handle = window.setTimeout(() => {
      setSearch((current) => (current === next ? current : next));
      setPage((currentPage) => (next === search ? currentPage : 1));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [q, search]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Karta to'ldirishlar
          </h1>
          <Link
            to="/admin/finance/deposits-overdue"
            className="mt-2 inline-flex text-sm font-semibold text-foreground underline-offset-2 hover:underline"
          >
            24 soatdan o'tgan cheklar
          </Link>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Bank izohidagi kodni qatordagi izoh kodi bilan solishtiring. Cheklar ko'paysa ham sahifa
            cho'zilmaydi: ro'yxat shu oynada aylanadi, rasm va identifikatorlar «Ochish» da.
            {pendingCount > 0 ? ` · ${pendingCount} ta tekshiruvda` : ""}
            {total > 0 ? ` · jami ${total} ta, sahifada ${PAGE_SIZE} tadan` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => {
          const tabCount =
            tab.id === ""
              ? (counts.claimed || 0) +
                (counts.awaiting_payment || 0) +
                (counts.approved || 0) +
                (counts.rejected || 0)
              : counts[tab.id] || 0;
          return (
            <button
              key={tab.id || "all"}
              type="button"
              onClick={() => {
                setStatus(tab.id);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                status === tab.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {!search && tabCount > 0 ? ` ${tabCount}` : ""}
            </button>
          );
        })}
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
            setPage(1);
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
          {search ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setQ("");
                setSearch("");
                setPage(1);
              }}
            >
              Tozalash
            </Button>
          ) : null}
        </form>
      </div>

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
        ) : listQ.isLoading && !listQ.data ? (
          <TableSkeleton rows={8} cols={7} />
        ) : rows.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="So'rovlar yo'q"
              description="Tanlangan filtrda karta to'ldirish so'rovlari topilmadi."
            />
          </div>
        ) : (
          <div ref={listRef} className="max-h-[calc(100dvh-20rem)] overflow-y-auto">
            {rows.map((row) => {
              const code = row.comment_code || row.transaction_ref;
              const email = publicEmail(row.user.email);
              const pending = row.status === "claimed" || row.status === "awaiting_payment";
              return (
                <article
                  key={row.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 last:border-b-0"
                >
                  <div className="min-w-0 flex-1 basis-48">
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: String(row.user.id) }}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {row.user.full_name || row.user.phone || `User #${row.user.id}`}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.user.phone || "—"}
                      {email ? ` · ${email}` : ""}
                      {` · ${formatWhen(row.created_at)}`}
                    </p>
                    {row.review_note ? (
                      <p className="truncate text-xs text-muted-foreground">
                        Izoh: {row.review_note}
                      </p>
                    ) : null}
                  </div>
                  <p className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatAdminUzs(row.amount)}
                  </p>
                  <button
                    type="button"
                    title="Izoh kodini nusxa olish"
                    className="w-32 shrink-0 truncate text-left font-mono text-sm font-bold text-foreground"
                    onClick={() => code && copyText("Izoh kodi", code)}
                  >
                    {code || "—"}
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className={statusBadgeClass(row.status)}>
                      {STATUS_LABEL[row.status] || row.status}
                    </Badge>
                    <Badge variant="secondary">{adminDepositChannelLabel(row)}</Badge>
                    {row.wallet_frozen ? (
                      <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                        Muzlatilgan
                      </Badge>
                    ) : null}
                    {!row.receipt_url && pending ? (
                      <span className="text-[11px] text-muted-foreground">Chek yo'q</span>
                    ) : null}
                  </div>
                  <div className="ml-auto flex shrink-0 gap-1.5">
                    {pending ? (
                      <>
                        {row.status === "claimed" ? (
                          <Button
                            size="sm"
                            disabled={approveM.isPending || rejectM.isPending}
                            onClick={() => askApprove(row)}
                          >
                            Tasdiqlash
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approveM.isPending || rejectM.isPending}
                          onClick={() => askReject(row)}
                        >
                          {row.status === "awaiting_payment" ? "Bekor qilish" : "Rad etish"}
                        </Button>
                      </>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setReceiptPreview(row)}>
                      Ochish
                    </Button>
                  </div>
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
            onPageChange={(next) => {
              setPage(next);
              listRef.current?.scrollTo({ top: 0 });
            }}
          />
        ) : null}
      </div>

      <Dialog
        open={!!receiptPreview}
        onOpenChange={(open) => {
          if (!open) setReceiptPreview(null);
        }}
      >
        <DialogContent className="max-h-[min(90vh,880px)] max-w-lg overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chek va identifikatorlar</DialogTitle>
            <DialogDescription>
              {receiptPreview
                ? `${receiptPreview.user.full_name || receiptPreview.user.phone || "User"} · ${formatAdminUzs(receiptPreview.amount)} · ${STATUS_LABEL[receiptPreview.status] || receiptPreview.status}`
                : null}
            </DialogDescription>
          </DialogHeader>
          {receiptPreview ? (
            <div className="grid gap-3">
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
                    className="max-h-64 w-full object-contain"
                  />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">Chek rasmi yo'q.</p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <IdCell
                  label="Izoh kodi"
                  value={receiptPreview.comment_code || receiptPreview.transaction_ref}
                  strong
                />
                <IdCell label="Merchant" value={receiptPreview.merchant_ref} strong />
                <IdCell label="Depozit ID" value={receiptPreview.id} />
                <IdCell label="User ID" value={String(receiptPreview.user.id || "")} />
                <IdCell label="Manba" value={adminDepositChannelLabel(receiptPreview)} />
                <IdCell label="Hamyon" value={receiptPreview.wallet_number} />
                <IdCell
                  label="Hamyon ID"
                  value={receiptPreview.wallet_id ? String(receiptPreview.wallet_id) : ""}
                />
                {receiptPreview.ledger_entry_id ? (
                  <IdCell label="Ledger ID" value={receiptPreview.ledger_entry_id} />
                ) : null}
                {receiptPreview.ledger_entry_hash ? (
                  <IdCell label="Ledger hash" value={receiptPreview.ledger_entry_hash} />
                ) : null}
                {receiptPreview.idempotency_key ? (
                  <IdCell label="Idempotency" value={receiptPreview.idempotency_key} />
                ) : null}
                {receiptPreview.client_ip ? (
                  <IdCell label="IP" value={receiptPreview.client_ip} />
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Yaratilgan {formatWhen(receiptPreview.created_at)}
                {receiptPreview.claimed_at
                  ? ` · Chek ${formatWhen(receiptPreview.claimed_at)}`
                  : ""}
                {` · Balans ${formatAdminUzs(receiptPreview.wallet_balance)}`}
              </p>
            </div>
          ) : null}
          {receiptPreview &&
          (receiptPreview.status === "claimed" || receiptPreview.status === "awaiting_payment") ? (
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                disabled={approveM.isPending || rejectM.isPending}
                onClick={() => askReject(receiptPreview)}
              >
                {receiptPreview.status === "awaiting_payment" ? "Bekor qilish" : "Rad etish"}
              </Button>
              {receiptPreview.status === "claimed" ? (
                <Button
                  disabled={approveM.isPending || rejectM.isPending || !receiptPreview.receipt_url}
                  onClick={() => askApprove(receiptPreview)}
                >
                  Tasdiqlash
                </Button>
              ) : null}
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
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tasdiqlangach pul foydalanuvchi hamyoniga tushadi. Keyingi qadamda izoh kodini
                qo'lda yozmasangiz, so'rov yuborilmaydi.
              </p>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tasdiq izohi — bo'sh qoldirsangiz standart matn yoziladi"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Chekdagi izoh kodini shu yerga yozing. Kod mos kelmasa pul tushmaydi.
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

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open && !rejectM.isPending) {
            setRejectTarget(null);
            setNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {rejectTarget?.status === "awaiting_payment"
                ? "So'rovni bekor qilasizmi?"
                : "Chekni rad etasizmi?"}
            </DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${rejectTarget.user.full_name || rejectTarget.user.phone || "User"} · ${formatAdminUzs(rejectTarget.amount)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Rad izohi — bo'sh qoldirsangiz standart matn yoziladi"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={rejectM.isPending}
              onClick={() => {
                setRejectTarget(null);
                setNote("");
              }}
            >
              Orqaga
            </Button>
            <Button
              variant="destructive"
              disabled={rejectM.isPending || !rejectTarget}
              onClick={() => {
                if (rejectTarget) rejectM.mutate(rejectTarget);
              }}
            >
              {rejectTarget?.status === "awaiting_payment" ? "Bekor qilish" : "Rad etish"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
