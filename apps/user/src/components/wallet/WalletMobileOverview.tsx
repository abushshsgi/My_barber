import { Link } from "@tanstack/react-router";
import { ChevronLeft, CreditCard, Crown, Gift, Inbox, Plus, QrCode, Sparkles } from "lucide-react";
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
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 5;

/** Bitta kirish nuqtasi har bir vazifa uchun — dublikat yo‘q. */
const QUICK_LINKS = [
  {
    id: "payments",
    to: "/wallet" as const,
    search: { section: "payments" as const },
    icon: CreditCard,
    labelKey: "walletPage.hubShort.payments",
    defaultLabel: "To'lov",
  },
  {
    id: "loyalty",
    to: "/wallet" as const,
    search: { section: "loyalty" as const },
    icon: Sparkles,
    labelKey: "walletPage.hubShort.loyalty",
    defaultLabel: "Bonus",
  },
  {
    id: "received",
    to: "/wallet/gifts" as const,
    search: undefined,
    icon: Inbox,
    labelKey: "walletPage.hubShort.received",
    defaultLabel: "Kelgan",
  },
  {
    id: "subscriptions",
    to: "/wallet" as const,
    search: { section: "subscriptions" as const },
    icon: Crown,
    labelKey: "walletPage.hubShort.subscriptions",
    defaultLabel: "Obuna",
  },
] as const;

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

  const tabLabels: Record<WalletTxTab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  const refreshBalance = async () => {
    await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
    await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
    await qc.invalidateQueries({ queryKey: ["wallet", "gifts-received"] });
  };

  return (
    <WalletPullRefresh onRefresh={refreshBalance} onRefreshingChange={setRefreshing}>
      <div className="overflow-x-hidden pb-6">
        <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
          <Link to="/profile" className={mobileBackButtonClass} aria-label={t("common.back")}>
            <ChevronLeft className="size-5" strokeWidth={2.25} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">{t("walletPage.title")}</h1>
            <p className="text-[11px] text-muted-foreground">{t("walletPage.pullHint")}</p>
          </div>
          <ProfileUpgradeButton variant="compact" />
        </header>

        {/* Full-bleed plastic card */}
        <div className="px-4 pt-2">
          <div className="relative mx-auto w-full max-w-[440px]">
            <ClientOnly
              fallback={
                <div className="aspect-[1.586/1] w-full animate-pulse rounded-[28px] bg-surface" />
              }
            >
              {isLoading ? (
                <div className="aspect-[1.586/1] w-full animate-pulse rounded-[28px] bg-surface" />
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

        <div className="mx-5 mt-4 space-y-4">
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

          <div className="grid grid-cols-4 gap-1 rounded-[22px] bg-surface/70 p-1.5">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  search={item.search}
                  className="flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition-colors hover:bg-background/80 active:bg-background"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-background">
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  </span>
                  <span className="text-center text-[10px] font-bold leading-tight text-foreground/90">
                    {t(item.labelKey, { defaultValue: item.defaultLabel })}
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            to="/wallet/qr-pay"
            className="flex items-center gap-3 rounded-[20px] border border-border/70 bg-card px-3.5 py-3 transition-transform active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface">
              <QrCode className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold">QR to'lov</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                Sartaroshga hamyondan to'lang
              </span>
            </span>
          </Link>
        </div>

        <WalletNewsSection className="mt-7" />

        <section className="mx-5 mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-bold">{t("walletPage.recent")}</h2>
            {hasAnyTransactions ? (
              <Link
                to="/wallet"
                search={{ section: "transactions" }}
                className="text-[11px] font-bold text-muted-foreground"
              >
                {t("walletPage.fullHistory")}
              </Link>
            ) : null}
          </div>
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
        </section>
      </div>
    </WalletPullRefresh>
  );
}
