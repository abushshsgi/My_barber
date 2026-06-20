import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { ChevronLeft, Gift, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { WalletDesktopPage } from "@/components/desktop/pages/WalletDesktopPage";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { ClientOnly } from "@/components/ClientOnly";
import { WalletPullRefresh } from "@/components/wallet/WalletPullRefresh";
import { WalletHubLinks } from "@/components/wallet/WalletHubLinks";
import { WalletTransactionsPanel } from "@/components/wallet/WalletTransactionsPanel";
import { SettingsFieldRow } from "@/components/settings/SettingsFieldRow";
import { useCurrency } from "@/hooks/use-currency";
import { useWalletBalance, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";

const walletSearchSchema = z.object({
  manage: z
    .union([z.boolean(), z.literal("1"), z.literal(1)])
    .optional()
    .transform((v) => v === true || v === "1" || v === 1),
});

export const Route = createFileRoute("/wallet")({
  validateSearch: walletSearchSchema,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hamyon — mysaloon.uz" },
      { name: "description", content: "Hamyon balansi, sovg'a kartalar va to'lov tarixi." },
    ],
  }),
  component: WalletPage,
});

function WalletMobile({ manage }: { manage?: boolean }) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { balance, walletNumber, card, isLoading } = useWalletBalance();
  const { data: transactions = [] } = useWalletTransactions("all", 50);
  const txCount = transactions.length;
  const inflowTotal = transactions
    .filter((tx) => tx.kind === "in")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const refreshBalance = async () => {
    await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
    await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
  };

  return (
    <WalletPullRefresh onRefresh={refreshBalance} onRefreshingChange={setRefreshing}>
      <div className="overflow-x-hidden pb-6">
        <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
          <Link
            to={manage ? "/wallet" : "/profile"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">{t("walletPage.title")}</h1>
            <p className="text-[11px] text-muted-foreground">{t("walletPage.pullHint")}</p>
          </div>
        </header>

        {!manage ? (
          <>
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
              <Link to="/giftcard" className="flex flex-col items-center gap-2">
                <span className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-foreground bg-card">
                  <Gift className="h-7 w-7" />
                </span>
                <span className="text-[11px] font-bold">{t("walletPage.gift")}</span>
              </Link>
            </div>

            <div className="mx-5 mt-6 flex gap-3">
              <div className="flex-1 rounded-[24px] bg-surface px-4 py-3 text-center">
                <p className="text-lg font-bold tabular-nums">{Math.round(inflowTotal / 1000)}k</p>
                <p className="text-[9px] font-bold uppercase text-muted-foreground">
                  {t("walletPage.stats.cashback")}
                </p>
              </div>
            </div>

            <section className="mx-5 mt-6">
              <h2 className="mb-2 text-[13px] font-bold">
                {t("walletPage.moreServices", { defaultValue: "Qo'shimcha xizmatlar" })}
              </h2>
              <WalletHubLinks compact />
            </section>

            <section className="mx-5 mt-8 border-t border-border pt-6">
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
                actionSearch={{ manage: true }}
              />
              <SettingsFieldRow
                label={t("settings.hubs.payments.title", { defaultValue: "To'lov usullari" })}
                value={t("settings.hubs.payments.metaEmpty", { defaultValue: "Click, Payme va hamyon" })}
                actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
                actionTo="/settings"
                actionSearch={{ section: "payments", manage: true }}
              />
            </section>
          </>
        ) : (
          <section className="mx-5 mt-4">
            <WalletTransactionsPanel />
          </section>
        )}
      </div>
    </WalletPullRefresh>
  );
}

function WalletPage() {
  const manage = Route.useSearch().manage;
  return (
    <DesktopPageSplit
      mobile={<WalletMobile manage={manage} />}
      desktop={<WalletDesktopPage manage={manage} />}
    />
  );
}
