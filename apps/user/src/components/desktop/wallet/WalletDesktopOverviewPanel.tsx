import { Link } from "@tanstack/react-router";
import { Gift, Plus, RefreshCw, Wallet as WalletIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { WalletDesktopTransactionTable } from "@/components/desktop/wallet/WalletDesktopTransactionTable";
import { DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance, useWalletMe, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { parseWalletBalance } from "@/lib/api/wallet";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 8;

/** Desktop overview — plastik karta yo'q, dashboard uslubi. */
export function WalletDesktopOverviewPanel() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WalletTxTab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { balance, walletNumber, isLoading } = useWalletBalance();
  const { data: walletMe } = useWalletMe();
  const { data: transactions = [], isLoading: txLoading } = useWalletTransactions(tab, 50);

  const visible = useMemo(
    () => filterWalletTransactions(transactions, tab).slice(0, RECENT_TX_LIMIT),
    [transactions, tab],
  );
  const hasAnyTransactions = transactions.length > 0;

  const inflowTotal = useMemo(
    () => transactions.filter((tx) => tx.kind === "in").reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );
  const outflowTotal = useMemo(
    () => transactions.filter((tx) => tx.kind === "out").reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );

  const refreshBalance = async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
      await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
    } finally {
      setRefreshing(false);
    }
  };

  const stats = [
    { label: t("walletPage.stats.cashback"), value: formatPrice(inflowTotal) },
    { label: t("walletPage.stats.bonus"), value: "0" },
    { label: t("walletPage.stats.spent", { defaultValue: "Chiqim" }), value: formatPrice(outflowTotal) },
  ];

  return (
    <div className="space-y-6">
      <div className={cn(DESKTOP_GLASS_PANEL, "p-6 lg:p-7")}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("walletPage.balanceLabel", { defaultValue: "Joriy balans" })}
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight text-foreground lg:text-[42px]">
              {isLoading ? "…" : formatPrice(balance)}
            </p>
            {walletNumber ? (
              <p className="mt-2 font-mono text-xs tracking-wide text-muted-foreground">{walletNumber}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshBalance()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} strokeWidth={2} />
              {t("walletPage.refresh", { defaultValue: "Yangilash" })}
            </button>
            <Link
              to="/wallet"
              search={{ section: "gift" }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface"
            >
              <Gift className="h-4 w-4" strokeWidth={2} />
              {t("walletPage.gift")}
            </Link>
            <Link
              to="/wallet/top-up"
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              {t("walletPage.topUp")}
            </Link>
          </div>
        </div>

        {walletMe ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border/60 bg-surface/50 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background ring-1 ring-border/60">
              <WalletIcon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t("walletPage.balanceLabel", { defaultValue: "Hamyon" })}
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold">{walletMe.card.card_display}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {formatPrice(parseWalletBalance(walletMe.balance))}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={cn(DESKTOP_GLASS_PANEL, "px-4 py-4")}>
            <p className="text-xl font-semibold tabular-nums text-foreground">{stat.value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <WalletDesktopTransactionTable
        items={visible}
        tab={tab}
        onTabChange={setTab}
        loading={txLoading}
        hasAny={hasAnyTransactions}
      />
    </div>
  );
}
