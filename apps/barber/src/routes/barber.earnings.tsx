import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, TrendingUp, Download, ArrowDownToLine, Receipt } from "lucide-react";
import { useBarberContext, formatUZS, type Booking } from "@/components/barber/BarberContext";
import { PageHeader, StatCard } from "@/components/barber/primitives";
import {
  EARNINGS_RANGES,
  filterCompletedBookingsByRange,
  filterTransactionsByRange,
  formatFinanceDate,
  startOfLocalDay,
  type EarningsRange,
} from "@/lib/finance-range";
import { cn } from "@/lib/utils";
import { useBarberPayoutsQuery, useInvalidateBarberQueries, usePayoutBalanceQuery } from "@/hooks/use-barber-queries";
import { apiFetch, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barber/earnings")({
  component: EarningsPage,
});

function useLast7DaysCompletedSeries(bookings: Booking[]) {
  return useMemo(() => {
    const amounts = new Array(7).fill(0);
    const end = startOfLocalDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      labels.push(d.toLocaleDateString("uz-UZ", { weekday: "short" }));
    }
    for (const b of bookings) {
      if (b.status !== "completed" || !b.start_at) continue;
      const dt = startOfLocalDay(new Date(b.start_at));
      const dayIdx = Math.round((dt.getTime() - start.getTime()) / 86400000);
      if (dayIdx >= 0 && dayIdx < 7) amounts[dayIdx] += b.price;
    }
    const max = Math.max(1, ...amounts);
    const bars = amounts.map((a) => Math.round((a / max) * 100));
    const weekSegmentTotal = amounts.reduce((s, x) => s + x, 0);
    return { bars, labels, weekSegmentTotal };
  }, [bookings]);
}

function EarningsPage() {
  const { transactions, bookings, financeTotals } = useBarberContext();
  const [range, setRange] = useState<EarningsRange>("Hafta");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { data: balance } = usePayoutBalanceQuery();
  const { data: payouts = [] } = useBarberPayoutsQuery();
  const { invalidatePayouts } = useInvalidateBarberQueries();

  const completed = useMemo(() => bookings.filter((b) => b.status === "completed"), [bookings]);
  const filteredBookings = useMemo(
    () => filterCompletedBookingsByRange(completed, range),
    [completed, range],
  );
  const filteredTransactions = useMemo(
    () => filterTransactionsByRange(transactions, range),
    [transactions, range],
  );

  const gross = filteredBookings.reduce((s, b) => s + b.price, 0);
  const rangeExpenses = filteredTransactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const balanceVal = balance ? Number(balance.available_balance) : gross - rangeExpenses;

  const { bars, labels, weekSegmentTotal } = useLast7DaysCompletedSeries(bookings);

  const exportCsv = () => {
    const header = "Sana,Mijoz,Narx,Holat\n";
    const rows = filteredBookings
      .map((b) =>
        [
          b.start_at ?? "",
          `"${(b.client ?? "").replace(/"/g, '""')}"`,
          String(b.price),
          b.status,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daromad-${range.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitWithdraw = async () => {
    const amount = Number(withdrawAmount.replace(/\s/g, ""));
    if (!amount || amount <= 0) {
      toast.error("Summani kiriting.");
      return;
    }
    if (!accountRef.trim()) {
      toast.error("Karta yoki hisob raqamini kiriting.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/barber/payouts/request/", {
        method: "POST",
        body: JSON.stringify({
          amount,
          account_reference: accountRef.trim(),
          idempotency_key: `wd-${Date.now()}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(formatApiError(body, "So'rov yuborilmadi."));
        return;
      }
      toast.success("Pul yechish so'rovi admin ga yuborildi.");
      setWithdrawOpen(false);
      setWithdrawAmount("");
      invalidatePayouts();
    } finally {
      setSubmitting(false);
    }
  };

  const rangeHint = range.toLowerCase();
  const showAllTimeNote = range === "Yil";
  const minWithdraw = balance ? Number(balance.min_withdrawal) : 50000;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Daromad"
        description="To'lovlar, daromad va hisob holati."
        actions={
          <>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredBookings.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium disabled:opacity-50"
            >
              <Download className="size-4" />
              Eksport
            </button>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <ArrowDownToLine className="size-4" />
              Pul yechish
            </button>
          </>
        }
      />

      <div className="rounded-2xl bg-foreground text-background p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-70">
          <Wallet className="size-3.5" />
          Mavjud balans (yechish uchun)
        </div>
        <div className="font-heading text-4xl sm:text-5xl font-semibold mt-2">
          {formatUZS(balanceVal)}
        </div>
        <div className="text-sm opacity-70 mt-2">
          Tanlangan davr sof: {formatUZS(gross - rangeExpenses)}
          {balance?.pending_payouts ? ` · kutilayotgan: ${formatUZS(Number(balance.pending_payouts))}` : null}
          {showAllTimeNote ? (
            <>
              {" "}
              · jami (barcha vaqt): {formatUZS(financeTotals.net_total)}
            </>
          ) : null}
        </div>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pul yechish</DialogTitle>
            <DialogDescription>
              So'rov admin tasdiqlagandan keyin to'lanadi. Minimal summa: {formatUZS(minWithdraw)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Summa (so'm)"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
            <input
              type="text"
              value={accountRef}
              onChange={(e) => setAccountRef(e.target.value)}
              placeholder="Karta yoki hisob raqami"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
              Bekor
            </Button>
            <Button onClick={() => void submitWithdraw()} disabled={submitting}>
              {submitting ? "Yuborilmoqda..." : "So'rov yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
        {EARNINGS_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm transition-colors",
              range === r
                ? "bg-background text-foreground shadow-card font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Yalpi daromad"
          value={formatUZS(gross)}
          hint={rangeHint}
        />
        <StatCard
          icon={<Receipt className="size-4" />}
          label="Xarajatlar"
          value={formatUZS(rangeExpenses)}
          hint={rangeHint}
        />
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Sof daromad"
          value={formatUZS(gross - rangeExpenses)}
          hint={rangeHint}
        />
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Yakunlangan bronlar"
          value={filteredBookings.length.toString()}
          hint={rangeHint}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Oxirgi 7 kun</h2>
            <div className="text-xs text-muted-foreground">
              Yakunlangan bronlar summasi · jami {formatUZS(weekSegmentTotal)}
            </div>
          </div>
          <div className="text-2xl font-heading font-semibold">{formatUZS(weekSegmentTotal)}</div>
        </div>
        <div className="flex items-end gap-3 h-48">
          {bars.map((h, i) => (
            <div key={labels[i] ?? i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full min-h-[2px] rounded-t-md bg-foreground/90 hover:bg-foreground transition-colors"
                style={{ height: `${h}%` }}
              />
              <div className="text-xs text-muted-foreground">{labels[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {payouts.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-lg font-semibold">Pul yechish tarixi</h2>
          </div>
          {payouts.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-4 px-5 py-3 items-center border-b border-border last:border-b-0"
            >
              <div className="col-span-4 text-sm">{p.created_at.slice(0, 10)}</div>
              <div className="col-span-4 text-sm font-medium">{formatUZS(Number(p.amount))}</div>
              <div className="col-span-4 text-sm text-muted-foreground capitalize">{p.status}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Tranzaksiyalar</h2>
          <span className="text-xs text-muted-foreground">{rangeHint}</span>
        </div>
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          <div className="col-span-3">Sana</div>
          <div className="col-span-3">Mijoz</div>
          <div className="col-span-3">Xizmat</div>
          <div className="col-span-2">Holat</div>
          <div className="col-span-1 text-right">Summa</div>
        </div>
        {filteredTransactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Tanlangan davrda tranzaksiyalar yo‘q.
          </div>
        ) : (
          filteredTransactions.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-12 gap-4 px-5 py-3 items-center border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <div className="col-span-3 text-sm text-muted-foreground">
                {formatFinanceDate(t.date)}
              </div>
              <div className="col-span-3 text-sm font-medium">{t.client}</div>
              <div className="col-span-3 text-sm text-muted-foreground">{t.service}</div>
              <div className="col-span-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
                    t.kind === "booking" &&
                      "bg-foreground/10 text-foreground border-foreground/20",
                    t.kind === "expense" && "bg-muted text-muted-foreground border-border",
                    t.status === "pending" && "bg-muted text-muted-foreground border-border",
                    t.status === "failed" &&
                      "bg-destructive/10 text-destructive border-destructive/20",
                  )}
                >
                  {t.kind === "booking"
                    ? "Bron"
                    : t.kind === "expense"
                      ? "Xarajat"
                      : t.status === "completed"
                        ? "Yakunlandi"
                        : t.status === "pending"
                          ? "Kutilmoqda"
                          : "Xato"}
                </span>
              </div>
              <div
                className={cn(
                  "col-span-1 text-right text-sm font-medium",
                  t.amount < 0 && "text-destructive",
                )}
              >
                {t.amount < 0 ? "-" : "+"}
                {formatUZS(Math.abs(t.amount))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
