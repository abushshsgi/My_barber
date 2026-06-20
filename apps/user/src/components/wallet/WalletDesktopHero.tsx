import { Link } from "@tanstack/react-router";
import { ArrowLeft, Gift, Plus, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ClientOnly } from "@/components/ClientOnly";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { WalletSectionNav } from "@/components/wallet/WalletSectionNav";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance } from "@/hooks/use-wallet";
import type { WalletSection } from "@/lib/wallet-nav";

type Props = {
  section: WalletSection;
};

export function WalletDesktopHero({ section }: Props) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { balance, walletNumber, card, isLoading } = useWalletBalance();

  return (
    <div className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-5 xl:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 text-sm font-semibold text-background/75 transition-colors hover:text-background"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            {t("common.back", { defaultValue: "Orqaga" })}
          </Link>
          <p className="text-sm font-semibold text-background/60">{t("walletPage.pullHint")}</p>
        </div>

        <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-background/55">
              {t("walletPage.title")}
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-background/50">
              {t("walletPage.balanceLabel", { defaultValue: "Joriy balans" })}
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums tracking-tight xl:text-[56px]">
              {isLoading ? "…" : formatPrice(balance)}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300/90">
              <TrendingUp className="h-4 w-4" />
              {t("walletPage.monthTrend")}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/wallet/top-up"
                className="inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-bold text-foreground transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                {t("walletPage.topUp")}
              </Link>
              <Link
                to="/wallet"
                search={{ section: "gift" }}
                className="inline-flex items-center gap-2 rounded-full border border-background/25 px-5 py-2.5 text-sm font-bold text-background transition-colors hover:bg-background/10"
              >
                <Gift className="h-4 w-4" />
                {t("walletPage.gift")}
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[300px] lg:mx-0 lg:max-w-[320px]">
            <ClientOnly fallback={<div className="aspect-[1.586/1] animate-pulse rounded-[26px] bg-background/10" />}>
              {isLoading ? (
                <div className="aspect-[1.586/1] animate-pulse rounded-[26px] bg-background/10" />
              ) : (
                <div className="[&_.mb-3]:hidden">
                  <PlasticCard
                    balance={balance}
                    cardholderName={card?.cardholder_name}
                    walletNumber={walletNumber}
                  />
                </div>
              )}
            </ClientOnly>
          </div>
        </div>

        <div className="mt-8 border-t border-background/15 pt-5">
          <WalletSectionNav active={section} t={t} horizontal inverted />
        </div>
      </div>
    </div>
  );
}
