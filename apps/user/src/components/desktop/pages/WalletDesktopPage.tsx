import { Link } from "@tanstack/react-router";
import { Gift, Plus, RefreshCw, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { WalletDesktopAside } from "@/components/desktop/wallet/WalletDesktopAside";
import { WalletDesktopShell } from "@/components/desktop/wallet/WalletDesktopShell";
import { WalletDesktopTransactionTable } from "@/components/desktop/wallet/WalletDesktopTransactionTable";
import { DESKTOP_ACCOUNT_BG, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { formatPrice } from "@/lib/price-display";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import type { WalletSection } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 12;

type Props = {
  section: WalletSection;
};

export function WalletDesktopPage({ section }: Props) {
  const { t } = useTranslation();

  if (section !== "overview") {
    return <WalletDesktopShell section={section} t={t} />;
  }

  return <WalletDesktopOverview t={t} />;
}

function WalletDesktopOverview({ t }: { t: ReturnType<typeof useTranslation>["t"] }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<WalletTxTab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { balance, walletNumber, isLoading } = useWalletBalance();
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
    {
      label: t("walletPage.stats.cashback"),
      value: isLoading ? "…" : formatPrice(inflowTotal),
    },
    {
      label: t("walletPage.stats.bonus"),
      value: "0",
    },
    {
      label: t("walletPage.stats.history"),
      value: String(transactions.length),
    },
  ];

  return (
    <div className={cn("mx-auto w-full max-w-6xl", DESKTOP_ACCOUNT_BG)}>
      <header className="border-b border-border/70 pb-8">
        <nav className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Link to="/profile" className="transition-colors hover:text-foreground">
            {t("profile.desktop.pageTitle", { defaultValue: "Mening hisobim" })}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground">{t("walletPage.title")}</span>
        </nav>
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground">{t("walletPage.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("walletPage.subtitle", { defaultValue: "Cashback, sovg'a karta va tarix" })}
        </p>
      </header>

      <section className="pt-8">
        <div className={cn(DESKTOP_GLASS_PANEL, "p-6 lg:p-8")}>
          <div className="flex flex-wrap items-end justify-between gap-6">
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
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-foreground">
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.2} />
                {t("walletPage.monthTrend")}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
        </div>
      </section>

      <section className="pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className={cn(DESKTOP_GLASS_PANEL, "px-5 py-4")}>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        {outflowTotal > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("walletPage.desktop.outflowHint", {
              defaultValue: "Bu oy sarflangan: {{amount}}",
              amount: formatPrice(outflowTotal),
            })}
          </p>
        ) : null}
      </section>

      <section className="grid gap-8 pb-12 pt-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <WalletDesktopTransactionTable
          items={visible}
          tab={tab}
          onTabChange={setTab}
          loading={txLoading}
          hasAny={hasAnyTransactions}
        />
        <WalletDesktopAside />
      </section>
    </div>
  );
}
