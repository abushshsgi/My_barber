import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Gift, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { ClientOnly } from "@/components/ClientOnly";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { DesktopPageHeader } from "@/components/desktop/ui/DesktopPageHeader";
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 20;

export function WalletDesktopPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WalletTxTab>("all");
  const { balance, walletNumber, card, isLoading } = useWalletBalance();
  const { data: transactions = [], isLoading: txLoading } = useWalletTransactions(tab, 50);

  const visible = useMemo(
    () => filterWalletTransactions(transactions, tab).slice(0, RECENT_TX_LIMIT),
    [transactions, tab],
  );
  const hasAnyTransactions = transactions.length > 0;

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
    <div>
      <DesktopPageHeader title={t("walletPage.title")} description={t("walletPage.pullHint")} />
      <div className="mt-8 grid grid-cols-[360px_1fr] gap-8 items-start">
        <aside className="space-y-6">
          <ClientOnly
            fallback={<div className="aspect-[1.586/1] animate-pulse rounded-[26px] bg-surface" />}
          >
            {isLoading ? (
              <div className="aspect-[1.586/1] animate-pulse rounded-[26px] bg-surface" />
            ) : (
              <PlasticCard
                balance={balance}
                cardholderName={card?.cardholder_name}
                walletNumber={walletNumber}
                monthTrend={t("walletPage.monthTrend")}
              />
            )}
          </ClientOnly>
          <div className="flex gap-6">
            <Link to="/wallet/top-up" className="flex flex-col items-center gap-2">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-background">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold">{t("walletPage.topUp")}</span>
            </Link>
            <Link to="/giftcard" className="flex flex-col items-center gap-2">
              <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-foreground">
                <Gift className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold">{t("walletPage.gift")}</span>
            </Link>
          </div>
        </aside>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{t("walletPage.recent")}</h2>
            <button type="button" onClick={refreshBalance} className="text-xs font-bold text-muted-foreground">
              Yangilash
            </button>
          </div>

          {hasAnyTransactions && (
            <div className="mt-4 flex gap-2">
              {(["all", "in", "out"] as WalletTxTab[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-bold",
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
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <WalletTransactionList items={visible} />
            </div>
          )}

          {hasAnyTransactions ? (
            <Link
              to="/wallet/history"
              className="mt-4 inline-flex rounded-full bg-surface px-5 py-2.5 text-xs font-bold"
            >
              {t("walletPage.fullHistory")}
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}
