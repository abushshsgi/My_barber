import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, Plus, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "@/components/ClientOnly";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { WalletHubLinks } from "@/components/wallet/WalletHubLinks";
import { WalletTransactionsPanel } from "@/components/wallet/WalletTransactionsPanel";
import { DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance, useWalletTransactions } from "@/hooks/use-wallet";
import { WALLET_SECTION_TITLE_KEYS, type WalletSection } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

type Props = {
  section: WalletSection;
};

export function WalletPanelContent({ section }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { balance, walletNumber, card, isLoading } = useWalletBalance();
  const { data: transactions = [] } = useWalletTransactions("all", 50);

  const inflowTotal = transactions
    .filter((tx) => tx.kind === "in")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const outflowTotal = transactions
    .filter((tx) => tx.kind === "out")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const titleMeta = WALLET_SECTION_TITLE_KEYS[section];

  return (
    <div>
      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
        {t(titleMeta.titleKey, { defaultValue: titleMeta.defaultTitle })}
      </h2>

      <div className="mt-4">
        {section === "overview" && (
          <div className="space-y-6">
            <div className={cn(DESKTOP_GLASS_PANEL, "flex flex-wrap items-end justify-between gap-4 p-6")}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("walletPage.balanceLabel", { defaultValue: "Joriy balans" })}
                </p>
                <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight">
                  {isLoading ? "…" : formatPrice(balance)}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  {t("walletPage.monthTrend")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/wallet/top-up"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  {t("walletPage.topUp")}
                </Link>
                <Link
                  to="/giftcard"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-bold transition-colors hover:bg-surface"
                >
                  <Gift className="h-4 w-4" />
                  {t("walletPage.gift")}
                </Link>
              </div>
            </div>

            <div className="mx-auto max-w-[380px]">
              <ClientOnly fallback={<div className="aspect-[1.586/1] animate-pulse rounded-[26px] bg-surface" />}>
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
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: t("walletPage.stats.cashback"), value: formatPrice(inflowTotal) },
                { label: t("walletPage.stats.history"), value: String(transactions.length) },
                {
                  label: t("walletPage.stats.spent", { defaultValue: "Chiqim" }),
                  value: formatPrice(outflowTotal),
                },
              ].map((stat) => (
                <div key={stat.label} className={cn(DESKTOP_GLASS_PANEL, "px-4 py-4")}>
                  <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <Link
              to="/wallet"
              search={{ section: "transactions" }}
              className={cn(
                DESKTOP_GLASS_PANEL,
                "flex items-center justify-between gap-3 p-5 transition-colors hover:bg-surface/40",
              )}
            >
              <div>
                <p className="text-sm font-bold">{t("walletPage.recent")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {transactions.length > 0
                    ? t("walletPage.txMetaCount", {
                        count: transactions.length,
                        defaultValue: "{{count}} ta tranzaksiya",
                      })
                    : t("walletPage.txMetaEmpty", { defaultValue: "Hali tranzaksiya yo'q" })}
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        )}

        {section === "transactions" && <WalletTransactionsPanel limit={30} />}

        {section === "services" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("walletPage.servicesHint", {
                defaultValue: "Bonus, sovg'a kartalar va aksiyalar.",
              })}
            </p>
            <WalletHubLinks compact />
            <Link
              to="/settings"
              search={{ section: "payments", manage: true }}
              className={cn(
                DESKTOP_GLASS_PANEL,
                "flex items-center justify-between gap-3 p-5 text-sm font-bold transition-colors hover:bg-surface/40",
              )}
            >
              <span>{t("settings.hubs.payments.title", { defaultValue: "To'lov usullari" })}</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
