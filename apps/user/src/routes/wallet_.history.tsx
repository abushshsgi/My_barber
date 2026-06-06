import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import {
  filterWalletTransactions,
  groupWalletTransactions,
  WALLET_TRANSACTIONS,
  type WalletTxTab,
} from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet_/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "To'liq tarix — mysaloon.uz" },
      { name: "description", content: "Hamyon tranzaksiyalari to'liq tarixi." },
    ],
  }),
  component: WalletHistoryPage,
});

function WalletHistoryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<WalletTxTab>("all");

  const filtered = useMemo(
    () => filterWalletTransactions(WALLET_TRANSACTIONS, tab),
    [tab],
  );
  const grouped = useMemo(() => groupWalletTransactions(filtered), [filtered]);

  const tabLabels: Record<WalletTxTab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  return (
    <ProfileSubpageLayout
      title={t("walletHistoryPage.title")}
      subtitle={t("walletHistoryPage.subtitle", { count: WALLET_TRANSACTIONS.length })}
      backTo="/wallet"
    >
      <div className="flex gap-2">
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

      {filtered.length === 0 ? (
        <WalletEmptyTransactions filteredEmpty />
      ) : (
        <div className="mt-5 space-y-6">
          {grouped.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </h2>
              <WalletTransactionList items={group.items} />
            </section>
          ))}
        </div>
      )}
    </ProfileSubpageLayout>
  );
}
