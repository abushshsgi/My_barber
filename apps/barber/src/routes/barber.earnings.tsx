import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wallet, TrendingUp, Download, ArrowDownToLine, Receipt, Loader2 } from "lucide-react";
import { formatUZS, useBarberContext } from "@/components/barber/BarberContext";
import { PageHeader, StatCard } from "@/components/barber/primitives";
import { EarningsPageSkeleton } from "@/components/barber/EarningsPageSkeleton";
import {
  EARNINGS_RANGES,
  formatFinanceDate,
  buildLast7DaysChart,
  last7DaysIsoParams,
  rangeToIsoParams,
  type EarningsRange,
} from "@/lib/finance-range";
import { cn } from "@/lib/utils";
import {
  prefetchEarningsPage,
  useBarberFinanceQuery,
  useBarberPayoutsQuery,
  useInvalidateBarberQueries,
  usePayoutBalanceQuery,
} from "@/hooks/use-barber-queries";
import { apiFetch, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { paymentLabel } from "@/lib/payment-label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { readOnboardingStatusCache } from "@/lib/onboarding-status-cache";

export const Route = createFileRoute("/barber/earnings")({
  loader: ({ context: { queryClient } }) => {
    const cached = readOnboardingStatusCache();
    if (cached?.fully_ready !== true) return;
    void prefetchEarningsPage(queryClient);
  },
  component: EarningsPage,
});

function EarningsPage() {
  const { fullyReady } = useBarberContext();
  const [range, setRange] = useState<EarningsRange>("Bugun");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountRef, setAccountRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rangeParams = useMemo(() => rangeToIsoParams(range), [range]);
  const chartParams = useMemo(() => last7DaysIsoParams(), []);
  const chartUsesRange = range === "Hafta";

  const {
    data: finance,
    isLoading: financeLoading,
    isFetching: financeFetching,
    isError: financeError,
  } = useBarberFinanceQuery(rangeParams, fullyReady);
  const { data: chartFinanceExtra, isLoading: chartLoading } = useBarberFinanceQuery(
    chartParams,
    fullyReady && !chartUsesRange,
  );
  const chartFinance = chartUsesRange ? finance : chartFinanceExtra;

  const onlineIncome = Number(finance?.income_total ?? finance?.online_total ?? 0);
  const cashTotal = Number(finance?.cash_total ?? 0);
  const totalIncome = Number(finance?.total_income ?? onlineIncome + cashTotal);
  const cashCount = finance?.cash_count ?? 0;
  const onlineCount = finance?.online_count ?? 0;
  const rangeExpenses = Number(finance?.expense_total ?? 0);
  const net = Number(finance?.net_total ?? 0);
  const transactions = finance?.transactions ?? [];

  const { data: balance, isLoading: balanceLoading } = usePayoutBalanceQuery(fullyReady);
  const { data: payouts, isLoading: payoutsLoading } = useBarberPayoutsQuery(fullyReady);
  const { invalidatePayouts, invalidateFinance } = useInvalidateBarberQueries();
  const balanceVal = balance ? Number(balance.available_balance) : 0;

  const chart = useMemo(() => {
    const daily = chartFinance?.daily ?? [];
    return buildLast7DaysChart(daily, []);
  }, [chartFinance?.daily]);

  const pageLoading = !fullyReady;

  const rangeLoading = financeFetching && finance === undefined;
  const balancePending = balanceLoading && balance === undefined;
  const chartPending = !chartUsesRange && chartLoading && chartFinanceExtra === undefined;

  const exportCsv = () => {
    const header = "Sana,Mijoz,Xizmat,To'lov,Summa\n";
    const rows = transactions
      .filter((t) => t.kind === "booking")
      .map((t) =>
        [
          t.date ?? "",
          `"${(t.client ?? "").replace(/"/g, '""')}"`,
          `"${(t.service ?? "").replace(/"/g, '""')}"`,
          paymentLabel(t.payment_method),
          String(t.amount),
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
      invalidateFinance();
    } finally {
      setSubmitting(false);
    }
  };

  if (pageLoading) {
    return <EarningsPageSkeleton />;
  }

  const rangeHint = range.toLowerCase();
  const minWithdraw = balance ? Number(balance.min_withdrawal) : 50000;
  const payoutList = payouts ?? [];
  const balanceValDisplay = balancePending ? "—" : formatUZS(balanceVal);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Daromad"
        description="Naqd va onlayn to'lovlar statistikada ko'rinadi. Pul yechish faqat karta/hamyon orqali to'langan summalar uchun."
        actions={
          <>
            <button
              type="button"
              onClick={exportCsv}
              disabled={transactions.length === 0}
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
          Hamyon balansi (karta / onlayn)
        </div>
        <div className="font-heading text-4xl sm:text-5xl font-semibold mt-2">
          {balancePending ? (
            <span className="inline-flex items-center gap-2 text-3xl">
              <Loader2 className="size-7 animate-spin opacity-70" />
            </span>
          ) : (
            balanceValDisplay
          )}
        </div>
        <div className="text-sm opacity-70 mt-2">
          Faqat onlayn to&apos;lovlar yechiladi
          {balance?.pending_payouts
            ? ` · kutilayotgan: ${formatUZS(Number(balance.pending_payouts))}`
            : null}
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

      {financeError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Daromad ma&apos;lumotlarini yuklab bo&apos;lmadi. Sahifani yangilab ko&apos;ring.
        </div>
      ) : null}

      {rangeLoading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {range} davri yuklanmoqda…
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Jami daromad"
            value={formatUZS(totalIncome)}
            hint={`${cashCount + onlineCount} ta bron · ${rangeHint}`}
          />
          <StatCard
            icon={<Wallet className="size-4" />}
            label="Naqd"
            value={formatUZS(cashTotal)}
            hint={`${cashCount} ta · yechib olinmaydi`}
          />
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Onlayn"
            value={formatUZS(onlineIncome)}
            hint={`${onlineCount} ta · yechish mumkin`}
          />
          <StatCard
            icon={<Receipt className="size-4" />}
            label="Xarajatlar"
            value={formatUZS(rangeExpenses)}
            hint={`${rangeHint} · sof onlayn ${formatUZS(net)}`}
          />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Oxirgi 7 kun</h2>
            <div className="text-xs text-muted-foreground">
              Barcha to&apos;lovlar (naqd + onlayn)
            </div>
          </div>
          <div className="text-2xl font-heading font-semibold">
            {formatUZS(chart.weekSegmentTotal)}
          </div>
        </div>
        <div className="flex h-48 items-end gap-2 sm:gap-3">
          {chartPending ? (
            <div className="flex h-full w-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Grafik yuklanmoqda…
            </div>
          ) : !chart.hasData ? (
            <p className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Oxirgi 7 kunda daromad yo&apos;q.
            </p>
          ) : (
            chart.bars.map((h, i) => (
              <div
                key={chart.labels[i] ?? i}
                className="flex h-full min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className="w-full min-h-[4px] rounded-t-md bg-foreground/90 transition-colors hover:bg-foreground"
                    style={{ height: `${Math.max(4, h)}%` }}
                    title={`${chart.labels[i]}: ${formatUZS(chart.amounts[i] ?? 0)}`}
                  />
                </div>
                <div className="shrink-0 text-[10px] text-muted-foreground sm:text-xs">
                  {chart.labels[i]}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {payoutList.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading text-lg font-semibold">Pul yechish tarixi</h2>
          </div>
          {payoutList.map((p) => (
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
          <span className="text-xs text-muted-foreground">{rangeHint} · naqd + onlayn</span>
        </div>
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          <div className="col-span-2">Sana</div>
          <div className="col-span-2">Mijoz</div>
          <div className="col-span-3">Xizmat</div>
          <div className="col-span-2">To&apos;lov</div>
          <div className="col-span-2">Holat</div>
          <div className="col-span-1 text-right">Summa</div>
        </div>
        {rangeLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Tranzaksiyalar yuklanmoqda…
          </div>
        ) : transactions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Tanlangan davrda tranzaksiyalar yo&apos;q.
          </div>
        ) : (
          transactions.map((t) => {
            const amount = Number(t.amount);
            return (
              <div
                key={t.id}
                className="grid grid-cols-12 gap-4 px-5 py-3 items-center border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-2 text-sm text-muted-foreground">
                  {formatFinanceDate(t.date)}
                </div>
                <div className="col-span-2 text-sm font-medium truncate">{t.client}</div>
                <div className="col-span-3 text-sm text-muted-foreground truncate">{t.service}</div>
                <div className="col-span-2 text-sm">{paymentLabel(t.payment_method)}</div>
                <div className="col-span-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
                      t.kind === "booking" &&
                        "bg-foreground/10 text-foreground border-foreground/20",
                      t.kind === "expense" && "bg-muted text-muted-foreground border-border",
                    )}
                  >
                    {t.kind === "booking" ? "Bron" : t.kind === "expense" ? "Xarajat" : t.status}
                  </span>
                </div>
                <div
                  className={cn(
                    "col-span-1 text-right text-sm font-medium",
                    amount < 0 && "text-destructive",
                  )}
                >
                  {amount < 0 ? "-" : "+"}
                  {formatUZS(Math.abs(amount))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
