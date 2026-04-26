import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet, TrendingUp, Download, ArrowDownToLine, Coins } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/earnings")({
  component: EarningsPage,
});

const RANGES = ["Bugun", "Hafta", "Oy", "Yil"] as const;

function EarningsPage() {
  const { transactions, bookings } = useBarberContext();
  const [range, setRange] = useState<(typeof RANGES)[number]>("Hafta");

  const completed = bookings.filter((b) => b.status === "completed");
  const gross = completed.reduce((s, b) => s + b.price, 0);
  const tips = transactions.filter((t) => t.kind === "tip").reduce((s, t) => s + t.amount, 0);
  const payouts = Math.abs(transactions.filter((t) => t.kind === "payout").reduce((s, t) => s + t.amount, 0));
  const balance = gross + tips - payouts;

  // mock chart heights
  const bars = [40, 65, 50, 80, 95, 70, 88];
  const days = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Daromad"
        description="To'lovlar, daromad va hisob holati."
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted">
              <Download className="size-4" />
              Eksport
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90">
              <ArrowDownToLine className="size-4" />
              Pul yechish
            </button>
          </>
        }
      />

      {/* Balance hero */}
      <div className="rounded-2xl bg-foreground text-background p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-70">
          <Wallet className="size-3.5" />
          Joriy balans
        </div>
        <div className="font-heading text-4xl sm:text-5xl font-semibold mt-2">
          {formatUZS(balance)}
        </div>
        <div className="text-sm opacity-70 mt-2">
          Keyingi to'lov: 30 Apr, payshanba
        </div>
      </div>

      {/* Range tabs */}
      <div className="inline-flex gap-1 bg-muted p-1 rounded-lg">
        {RANGES.map((r) => (
          <button
            key={r}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp className="size-4" />} label="Yalpi daromad" value={formatUZS(gross)} trend={{ value: 18 }} hint={range.toLowerCase()} />
        <StatCard icon={<Coins className="size-4" />} label="Chaylar" value={formatUZS(tips)} trend={{ value: 5 }} hint={range.toLowerCase()} />
        <StatCard icon={<ArrowDownToLine className="size-4" />} label="Yechilgan" value={formatUZS(payouts)} hint="Hammasi" />
        <StatCard icon={<Wallet className="size-4" />} label="Bronlar" value={completed.length.toString()} trend={{ value: 12 }} hint={range.toLowerCase()} />
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Haftalik daromad</h2>
            <div className="text-xs text-muted-foreground">Kunma-kun taqsimot</div>
          </div>
          <div className="text-2xl font-heading font-semibold">{formatUZS(gross)}</div>
        </div>
        <div className="flex items-end gap-3 h-48">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-md bg-foreground/90 hover:bg-foreground transition-colors"
                style={{ height: `${h}%` }}
              />
              <div className="text-xs text-muted-foreground">{days[i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Tranzaksiyalar</h2>
          <button className="text-xs text-muted-foreground hover:text-foreground">Hammasi</button>
        </div>
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/30">
          <div className="col-span-3">Sana</div>
          <div className="col-span-3">Mijoz</div>
          <div className="col-span-3">Xizmat</div>
          <div className="col-span-2">Holat</div>
          <div className="col-span-1 text-right">Summa</div>
        </div>
        {transactions.map((t) => (
          <div key={t.id} className="grid grid-cols-12 gap-4 px-5 py-3 items-center border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
            <div className="col-span-3 text-sm text-muted-foreground">{t.date}</div>
            <div className="col-span-3 text-sm font-medium">{t.client}</div>
            <div className="col-span-3 text-sm text-muted-foreground">{t.service}</div>
            <div className="col-span-2">
              <span className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
                t.status === "completed" && "bg-foreground/10 text-foreground border-foreground/20",
                t.status === "pending" && "bg-muted text-muted-foreground border-border",
                t.status === "failed" && "bg-destructive/10 text-destructive border-destructive/20",
              )}>
                {t.status === "completed" ? "Yakunlandi" : t.status === "pending" ? "Kutilmoqda" : "Xato"}
              </span>
            </div>
            <div className={cn(
              "col-span-1 text-right text-sm font-medium",
              t.amount < 0 && "text-destructive",
            )}>
              {t.amount < 0 ? "-" : "+"}{formatUZS(Math.abs(t.amount))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
