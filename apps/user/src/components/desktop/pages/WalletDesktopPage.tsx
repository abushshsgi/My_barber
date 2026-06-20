import { Link } from "@tanstack/react-router";
import { ChevronLeft, Gift, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "@/components/ClientOnly";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { WalletHubLinks } from "@/components/wallet/WalletHubLinks";
import { WalletTransactionsPanel } from "@/components/wallet/WalletTransactionsPanel";
import { SettingsFieldRow } from "@/components/settings/SettingsFieldRow";
import { DESKTOP_ACCOUNT_BG, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance, useWalletTransactions } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";

type Props = {
  manage?: boolean;
};

export function WalletDesktopPage({ manage }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { balance, walletNumber, card, isLoading } = useWalletBalance();
  const { data: transactions = [] } = useWalletTransactions("all", 50);

  const inflowTotal = transactions
    .filter((tx) => tx.kind === "in")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const txCount = transactions.length;
  const manageSearch = { manage: true as const };

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
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("walletPage.pullHint")}</p>
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

          <div>
            <h2 className="mb-3 text-sm font-bold">
              {t("walletPage.moreServices", { defaultValue: "Qo'shimcha xizmatlar" })}
            </h2>
            <WalletHubLinks compact />
          </div>
        </aside>

        <section className={cn(DESKTOP_GLASS_PANEL, "p-5 lg:p-6")}>
          {!manage ? (
            <>
              <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
                {t("walletPage.overview", { defaultValue: "Hamyon" })}
              </h2>
              <div className="mt-2">
                <SettingsFieldRow
                  label={t("walletPage.recent")}
                  value={
                    txCount > 0
                      ? t("walletPage.txMetaCount", {
                          count: txCount,
                          defaultValue: "{{count}} ta tranzaksiya",
                        })
                      : t("walletPage.txMetaEmpty", { defaultValue: "Hali tranzaksiya yo'q" })
                  }
                  hint={t("walletPage.txHint", { defaultValue: "Kirim va chiqimlar tarixi." })}
                  actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
                  actionTo="/wallet"
                  actionSearch={manageSearch}
                />
                <SettingsFieldRow
                  label={t("walletPage.topUp")}
                  value={formatPrice(balance)}
                  hint={t("walletPage.topUpHint", { defaultValue: "Balansni to'ldiring." })}
                  actionLabel={t("settings.actions.add", { defaultValue: "Qo'shish" })}
                  actionTo="/wallet/top-up"
                />
                <SettingsFieldRow
                  label={t("settings.hubs.payments.title", { defaultValue: "To'lov usullari" })}
                  value={t("settings.hubs.payments.metaEmpty", { defaultValue: "Click, Payme va hamyon" })}
                  actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
                  actionTo="/settings"
                  actionSearch={{ section: "payments", manage: true }}
                />
              </div>
            </>
          ) : (
            <>
              <Link
                to="/wallet"
                className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                {t("common.back", { defaultValue: "Orqaga" })}
              </Link>
              <WalletTransactionsPanel />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
