import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { PaymeLogo } from "@/components/brand/PaymeLogo";
import { EmptyState } from "@/components/admin/EmptyState";
import { KPICard } from "@/components/admin/KPICard";
import { TableSkeleton } from "@/components/admin/Skeletons";
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
import { fetchAdminSubscriptionPayments } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import {
  PAYME_STATUS_LABEL,
  formatPayWhen,
  paymeChannel,
  paymeStateLabel,
} from "@/lib/payme-payment";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/finance/payme")({
  component: AdminPaymePaymentsPage,
});

const STATUS_FILTERS = [
  { id: "", label: "Hammasi" },
  { id: "paid", label: "To'langan" },
  { id: "pending", label: "Kutilmoqda" },
  { id: "failed", label: "Muvaffaqiyatsiz" },
  { id: "cancelled", label: "Bekor" },
  { id: "refunded", label: "Qaytarilgan" },
  { id: "expired", label: "Muddati o'tgan" },
];

function AdminPaymePaymentsPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const paymentsQ = useQuery({
    queryKey: ["admin", "finance", "payme", status, search, page],
    queryFn: () =>
      fetchAdminSubscriptionPayments({
        provider: "payme",
        status: status || undefined,
        q: search || undefined,
        page,
      }),
  });

  const rows = paymentsQ.data?.results ?? [];
  const count = paymentsQ.data?.count ?? 0;
  const paidSum = useMemo(
    () => rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + (r.amount_uzs || 0), 0),
    [rows],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PaymeLogo height={28} />
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Payme to'lovlar</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Payme orqali o'tgan har bir to'lov: qachon yaratilgan, qachon to'langan, qaysi karta,
            chek, buyurtma va holat.
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">{count} ta yozuv</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard label="Jami yozuv" value={String(count)} icon={Wallet} />
        <KPICard
          label="Shu sahifada to'langan"
          value={formatAdminUzs(paidSum)}
          hint={`${rows.filter((r) => r.status === "paid").length} ta`}
          icon={Wallet}
        />
        <KPICard
          label="Shu sahifa"
          value={String(rows.length)}
          hint={`Sahifa ${page}`}
          icon={Wallet}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id || "all"}
              type="button"
              onClick={() => {
                setStatus(f.id);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                status === f.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(q.trim());
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, telefon, order, chek ID…"
          />
          <Button type="submit" variant="outline" size="icon" aria-label="Qidirish">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {paymentsQ.isLoading ? (
          <div className="mt-4">
            <TableSkeleton />
          </div>
        ) : paymentsQ.isError ? (
          <EmptyState title="Yuklanmadi" description="Payme to'lovlarini olib bo'lmadi." />
        ) : !rows.length ? (
          <EmptyState title="Payme to'lovi yo'q" description="Filtrni o'zgartiring yoki yangi to'lov kuting." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Qachon</TableHead>
                  <TableHead>Mijoz</TableHead>
                  <TableHead>Nima orqali</TableHead>
                  <TableHead>Reja</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Identifikatorlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      <div>
                        <span className="text-muted-foreground">To'langan: </span>
                        {formatPayWhen(row.payme_pay_time || row.paid_at)}
                      </div>
                      <div className="mt-1">
                        <span className="text-muted-foreground">Yaratilgan: </span>
                        {formatPayWhen(row.payme_create_time || row.created_at)}
                      </div>
                      {row.payme_cancel_time ? (
                        <div className="mt-1">
                          <span className="text-muted-foreground">Bekor: </span>
                          {formatPayWhen(row.payme_cancel_time)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {row.user?.full_name || row.user_name || row.user?.phone || `#${row.user_id}`}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.user?.phone || row.user_phone}</div>
                      {row.user?.email ? (
                        <div className="text-xs text-muted-foreground">{row.user.email}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <PaymeLogo height={16} />
                      <div className="mt-1 text-xs font-medium">{paymeChannel(row)}</div>
                      {row.sandbox ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">Sandbox</div>
                      ) : null}
                      {row.payme_description ? (
                        <div className="mt-1 max-w-[180px] text-[11px] text-muted-foreground">
                          {row.payme_description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="capitalize text-sm">{row.plan_code}</TableCell>
                    <TableCell className="tabular-nums text-sm">
                      <div className="font-semibold">{formatAdminUzs(row.amount_uzs)}</div>
                      {row.amount_tiyin ? (
                        <div className="text-[11px] text-muted-foreground">{row.amount_tiyin} tiyin</div>
                      ) : null}
                      {row.has_discount ? (
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {row.promo_code || "chegirma"} −{formatAdminUzs(row.discount_uzs)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PAYME_STATUS_LABEL[row.status] || row.status}</Badge>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Payme: {paymeStateLabel(row.payme_state)}
                        {row.payme_state != null ? ` (${row.payme_state})` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] font-mono text-[11px] leading-5">
                      <div className="truncate" title={row.order_id}>
                        order: {row.order_id || "—"}
                      </div>
                      <div className="truncate" title={row.payme_receipt_id}>
                        chek: {row.payme_receipt_id || "—"}
                      </div>
                      <div className="truncate" title={row.transaction_id}>
                        trx: {row.transaction_id || "—"}
                      </div>
                      {row.subscription_id ? (
                        <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
                          <Link to="/admin/subscriptions/$subId" params={{ subId: row.subscription_id }}>
                            Obuna
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Oldingi
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">{page}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rows.length < 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </Button>
        </div>
      </div>
    </div>
  );
}
