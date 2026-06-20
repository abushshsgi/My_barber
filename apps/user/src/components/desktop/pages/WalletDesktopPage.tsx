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
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { DESKTOP_ACCOUNT_BG, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 20;

export function WalletDesktopPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const [tab, setTab] = useState<WalletTxTab>("all");
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
    <div className={cn("w-full", DESKTOP_ACCOUNT_BG)}>
      <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-foreground transition-colors hover:opacity-80"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
          {t("common.back", { defaultValue: "Orqaga" })}
        </Link>
        <Link
          to="/profile"
          className="text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
        >
          {t("settings.done", { defaultValue: "Tayyor" })}
        </Link>
      </div>

      <header className="border-b border-border/70 pb-8">
        <h1 className="text-[32px] font-semibold tracking-tight text-foreground xl:text-[36px]">
          {t("walletPage.title")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("walletPage.pullHint")}
        </p>
      </header>

      <div className="grid gap-10 pt-8 lg:grid-cols-[minmax(320px,380px)_minmax(0,1fr)] xl:gap-14 lg:pb-12">
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

          <div className="flex flex-wrap gap-8">
            <Link to="/wallet/top-up" className="group flex flex-col items-center gap-2.5">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform group-hover:scale-105">
                <Plus className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold">{t("walletPage.topUp")}</span>
            </Link>
            <Link to="/giftcard" className="group flex flex-col items-center gap-2.5">
              <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-foreground bg-background transition-transform group-hover:scale-105">
                <Gift className="h-6 w-6" />
              </span>
              <span className="text-xs font-bold">{t("walletPage.gift")}</span>
            </Link>
          </div>

          <div className={cn(DESKTOP_GLASS_PANEL, "px-5 py-4")}>
            <p className="text-2xl font-bold tabular-nums tracking-tight">{formatPrice(inflowTotal)}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("walletPage.stats.cashback")}
            </p>
          </div>

          <WalletPaymentMethodsRow className="mx-0 mt-0" variant="desktop" />

          <div>
            <h2 className="mb-3 text-sm font-bold">
              {t("walletPage.moreServices", { defaultValue: "Hamyon va to'lov" })}
            </h2>
            <WalletHubLinks compact />
          </div>
        </aside>

        <section className={cn(DESKTOP_GLASS_PANEL, "p-5 lg:p-6")}>
          <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
            <h2 className="text-lg font-bold">{t("walletPage.recent")}</h2>
            <button
              type="button"
              onClick={() => void refreshBalance()}
              className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {t("common.refresh", { defaultValue: "Yangilash" })}
            </button>
          </div>

          {hasAnyTransactions ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {(["all", "in", "out"] as WalletTxTab[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-bold transition-colors",
                    tab === k ? "bg-foreground text-background" : "bg-surface text-muted-foreground",
                  )}
                >
                  {tabLabels[k]}
                </button>
              ))}
            </div>
          ) : null}

          {txLoading ? (
            <div className="mt-5 h-32 animate-pulse rounded-2xl bg-surface" />
          ) : !hasAnyTransactions ? (
            <WalletEmptyTransactions filteredEmpty={false} />
          ) : visible.length === 0 ? (
            <WalletEmptyTransactions filteredEmpty />
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-border/60">
              <WalletTransactionList items={visible} />
            </div>
          )}

          {hasAnyTransactions ? (
            <Link
              to="/wallet/history"
              className="mt-5 inline-flex rounded-full bg-surface px-5 py-2.5 text-xs font-bold transition-colors hover:bg-surface/80"
            >
              {t("walletPage.fullHistory")}
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}
