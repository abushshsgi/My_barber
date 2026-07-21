import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Gift, Plus, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { ClientOnly } from "@/components/ClientOnly";
import { mobileBackButtonClass } from "@/components/mobile/MobileBackButton";
import { ProfileUpgradeButton } from "@/components/profile/ProfileUpgradeButton";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletNewsSection } from "@/components/wallet/WalletNewsSection";
import { WalletPullRefresh } from "@/components/wallet/WalletPullRefresh";
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { WALLET_HUB_LINKS } from "@/lib/wallet-nav";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 5;

export function WalletMobileOverview() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
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
  const outflowTotal = useMemo(
    () => transactions.filter((tx) => tx.kind === "out").reduce((sum, tx) => sum + tx.amount, 0),
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
            className={mobileBackButtonClass}
            aria-label={t("common.back")}
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">{t("walletPage.title")}</h1>
            <p className="text-[11px] text-muted-foreground">{t("walletPage.pullHint")}</p>
          </div>
          <ProfileUpgradeButton variant="compact" />
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
                />
              )}
            </ClientOnly>
          </div>
        </div>

        <div className="mx-5 mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              to="/wallet/top-up"
              className="flex items-center gap-3 rounded-[20px] bg-foreground px-4 py-3.5 text-background shadow-sm transition-transform active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-background/15">
                <Plus className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{t("walletPage.topUp")}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-background/65">
                  {t("walletPage.topUpHint")}
                </span>
              </span>
            </Link>
            <Link
              to="/wallet"
              search={{ section: "gift" }}
              className="flex items-center gap-3 rounded-[20px] border border-border bg-card px-4 py-3.5 transition-transform active:scale-[0.98]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface">
                <Gift className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight">{t("walletPage.gift")}</span>
                <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                  {t("walletPage.giftHint", { defaultValue: "Do'stingizga yuboring" })}
                </span>
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] bg-surface px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("walletPage.stats.cashback")}
              </p>
              <p className="mt-1 text-[15px] font-bold tabular-nums tracking-tight">
                {formatPrice(inflowTotal)}
              </p>
            </div>
            <div className="rounded-[18px] bg-surface px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {t("walletPage.stats.spent", { defaultValue: "Chiqim" })}
              </p>
              <p className="mt-1 text-[15px] font-bold tabular-nums tracking-tight">
                {formatPrice(outflowTotal)}
              </p>
            </div>
          </div>

          <div className="rounded-[22px] border border-border/60 bg-card p-2">
            <div className="grid grid-cols-4 gap-1">
              {WALLET_HUB_LINKS.map((item) => {
                const Icon = item.icon;
                const short =
                  item.section === "payments"
                    ? t("walletPage.hubShort.payments", { defaultValue: "To'lov" })
                    : item.section === "loyalty"
                      ? t("walletPage.hubShort.loyalty", { defaultValue: "Bonus" })
                      : item.section === "gift"
                        ? t("walletPage.hubShort.gift", { defaultValue: "Sovg'a" })
                        : t("walletPage.hubShort.subscriptions", { defaultValue: "Obuna" });
                return (
                  <Link
                    key={item.section}
                    to="/wallet"
                    search={{ section: item.section }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition-colors hover:bg-surface active:bg-surface"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                    </span>
                    <span className="text-center text-[10px] font-bold leading-tight text-foreground/90">
                      {short}
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link
              to="/wallet"
              search={{ section: "transactions" }}
              className="mt-1 flex items-center justify-between gap-2 rounded-2xl bg-surface/80 px-3.5 py-2.5 transition-colors hover:bg-surface"
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-card">
                  <Receipt className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <span className="text-[12px] font-bold">{t("walletPage.nav.transactions")}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
            </Link>
          </div>
        </div>

        <WalletNewsSection className="mt-7" />

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
