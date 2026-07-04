import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowLeft, Loader2, Wallet } from "lucide-react";
import { formatUZS, useBarberContext } from "@/components/barber/BarberContext";
import { PageHeader, StatCard } from "@/components/barber/primitives";
import { useBarberPayoutsQuery, usePayoutBalanceQuery } from "@/hooks/use-barber-queries";
import { formatFinanceDate } from "@/lib/finance-range";
import { payoutStatusClass, payoutStatusLabel, sumPaidPayouts } from "@/lib/payout-status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/withdrawals")({
  component: WithdrawalsHistoryPage,
});

function WithdrawalsHistoryPage() {
  const { fullyReady } = useBarberContext();
  const { data: payouts, isLoading } = useBarberPayoutsQuery(fullyReady);
  const { data: balance } = usePayoutBalanceQuery(fullyReady);

  const list = payouts ?? [];
  const totalWithdrawn = sumPaidPayouts(list);
  const pendingTotal = list
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + Number(p.amount), 0);
  const available = balance ? Number(balance.available_balance) : 0;

  return (
    <div className="mx-auto max-w-[900px] space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Onlayn pul yechish tarixi"
        description="Karta yoki hamyonga yuborilgan onlayn to'lovlar. Naqd bronlar bu yerda ko'rinmaydi."
        actions={
          <Link
            to="/barber/earnings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
          >
            <ArrowLeft className="size-4" />
            Daromad
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Yechish mumkin"
          value={formatUZS(available)}
          hint="Onlayn balans"
        />
        <StatCard
          icon={<ArrowDownToLine className="size-4" />}
          label="Jami yechilgan"
          value={formatUZS(totalWithdrawn)}
          hint={`${list.filter((p) => p.status === "paid").length} ta to'lov`}
        />
        <StatCard
          icon={<Loader2 className="size-4" />}
          label="Kutilmoqda"
          value={formatUZS(pendingTotal)}
          hint={`${list.filter((p) => p.status === "pending").length} ta so'rov`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Barcha so'rovlar</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Admin tasdiqlagandan keyin pul hisobingizga o'tkaziladi
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Yuklanmoqda…
          </div>
        ) : list.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ArrowDownToLine className="mx-auto mb-3 size-10 stroke-[1.5] text-muted-foreground/50" />
            <p className="font-medium text-foreground">Hali pul yechilmagan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Onlayn to'lovlar kelgach, Daromad sahifasidan yechish mumkin.
            </p>
            <Link
              to="/barber/earnings"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background"
            >
              Daromadga o'tish
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-heading text-base font-semibold tabular-nums">
                    {formatUZS(Number(p.amount))}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFinanceDate(p.created_at)}
                    {p.reference ? ` · ${p.reference}` : null}
                    {p.paid_at ? ` · to'landi: ${formatFinanceDate(p.paid_at)}` : null}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    payoutStatusClass(p.status),
                  )}
                >
                  {payoutStatusLabel(p.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
