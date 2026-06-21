import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { filterWalletTransactions, type WalletTxTab } from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

type Props = {
  limit?: number;
  showFullHistoryLink?: boolean;
  fullHistoryTo?: { to: string; search?: Record<string, string> };
};

export function WalletTransactionsPanel({
  limit = 20,
  showFullHistoryLink = true,
  fullHistoryTo,
}: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WalletTxTab>("all");
  const { data: transactions = [], isLoading: txLoading } = useWalletTransactions(tab, 50);

  const visible = useMemo(
    () => filterWalletTransactions(transactions, tab).slice(0, limit),
    [limit, transactions, tab],
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
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold">{t("walletPage.recent")}</h3>
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

      {showFullHistoryLink && hasAnyTransactions ? (
        <Link
          to={fullHistoryTo?.to ?? "/wallet"}
          search={(fullHistoryTo?.search ?? { section: "transactions" }) as never}
          className="mt-5 inline-flex rounded-full bg-surface px-5 py-2.5 text-xs font-bold transition-colors hover:bg-surface/80"
        >
          {t("walletPage.fullHistory")}
        </Link>
      ) : null}
    </div>
  );
}
