import { Link } from "@tanstack/react-router";
import { ChevronLeft, Gift, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@/components/ClientOnly";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletHubLinks } from "@/components/wallet/WalletHubLinks";
import { WalletPaymentMethodsRow } from "@/components/wallet/WalletPaymentMethodsRow";
import { WalletPullRefresh } from "@/components/wallet/WalletPullRefresh";
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 5;

export function WalletMobileOverview() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WalletTxTab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { balance, walletNumber, card, isLoading } = useWalletBalance();
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

  const tabLabels: Record<WalletTxTab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  const refreshBalance = async () => {
    await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
    await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
  };

  return (
    <WalletPullRefresh onRefresh={refreshBalance} onRefreshingChange={setRefreshing}>
      <div className="overflow-x-hidden pb-6">
        <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
          <Link
            to="/profile"
            className="neo-pill grid h-11 w-11 shrink-0 place-items-center"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">{t("walletPage.title")}</h1>
            <p className="text-[11px] text-muted-foreground">{t("walletPage.pullHint")}</p>
          </div>
        </header>

        <div className="px-5 pt-2">
          <div className="relative mx-auto flex min-h-[210px] w-full max-w-[360px] items-center justify-center py-4">
            <ClientOnly fallback={<div className="aspect-[1.586/1] w-full max-w-[340px] animate-pulse rounded-[26px] bg-surface" />}>
              {isLoading ? (
                <div className="aspect-[1.586/1] w-full max-w-[340px] animate-pulse rounded-[26px] bg-surface" />
              ) : (
                <PlasticCard
                  balance={balance}
                  cardholderName={card?.cardholder_name}
                  walletNumber={walletNumber}
                  refreshing={refreshing}
                  monthTrend={t("walletPage.monthTrend")}
                />
              )}
            </ClientOnly>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-10 px-5">
          <Link to="/wallet/top-up" className="flex flex-col items-center gap-2">
            <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-foreground text-background shadow-lg">
              <Plus className="h-7 w-7" />
            </span>
            <span className="text-[11px] font-bold">{t("walletPage.topUp")}</span>
          </Link>
          <Link to="/wallet" search={{ section: "gift" }} className="flex flex-col items-center gap-2">
            <span className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-foreground bg-card">
              <Gift className="h-7 w-7" />
            </span>
            <span className="text-[11px] font-bold">{t("walletPage.gift")}</span>
          </Link>
        </div>

        <div className="mx-5 mt-6 flex gap-3">
          <div className="flex-1 rounded-[24px] bg-surface px-4 py-3 text-center">
            <p className="text-lg font-bold tabular-nums">{Math.round(inflowTotal / 1000)}k</p>
            <p className="text-[9px] font-bold uppercase text-muted-foreground">{t("walletPage.stats.cashback")}</p>
          </div>
        </div>

        <WalletPaymentMethodsRow />

        <section className="mx-5 mt-6">
          <h2 className="mb-2 text-[13px] font-bold">{t("walletPage.moreServices", { defaultValue: "Hamyon va to'lov" })}</h2>
          <WalletHubLinks compact />
        </section>

        <section className="mx-5 mt-8">
          <h2 className="text-sm font-bold">{t("walletPage.recent")}</h2>
          {hasAnyTransactions && (
            <div className="mt-3 flex gap-2">
              {(["all", "in", "out"] as WalletTxTab[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] font-bold",
                    tab === k ? "bg-foreground text-background" : "bg-surface text-muted-foreground",
                  )}
                >
                  {tabLabels[k]}
                </button>
              ))}
            </div>
          )}
          {txLoading ? (
            <div className="mt-4 h-24 animate-pulse rounded-2xl bg-surface" />
          ) : !hasAnyTransactions ? (
            <WalletEmptyTransactions filteredEmpty={false} />
          ) : visible.length === 0 ? (
            <WalletEmptyTransactions filteredEmpty />
          ) : (
            <div className="mt-4">
              <WalletTransactionList items={visible} />
            </div>
          )}
          {hasAnyTransactions && (
            <Link
              to="/wallet"
              search={{ section: "transactions" }}
              className="mt-4 flex w-full items-center justify-center rounded-full bg-surface py-3.5 text-[12px] font-bold"
            >
              {t("walletPage.fullHistory")}
            </Link>
          )}
        </section>
      </div>
    </WalletPullRefresh>
  );
}
