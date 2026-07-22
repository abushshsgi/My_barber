import { Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletTransactionReceiptSheet } from "@/components/wallet/WalletTransactionReceiptSheet";
import {
  formatWalletTxAmount,
  type WalletTransaction,
  type WalletTxTab,
} from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

type Props = {
  items: WalletTransaction[];
  tab: WalletTxTab;
  onTabChange: (tab: WalletTxTab) => void;
  loading: boolean;
  hasAny: boolean;
  showViewAll?: boolean;
};

export function WalletDesktopTransactionTable({
  items,
  tab,
  onTabChange,
  loading,
  hasAny,
  showViewAll = true,
}: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<WalletTransaction | null>(null);

  const tabLabels: Record<WalletTxTab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm")}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-5 py-4">
        <h2 className="text-base font-semibold text-foreground">{t("walletPage.recent")}</h2>
        {hasAny ? (
          <div className="flex gap-1 rounded-xl bg-surface p-1">
            {(["all", "in", "out"] as WalletTxTab[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onTabChange(k)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  tab === k ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {tabLabels[k]}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="mx-5 my-6 h-32 animate-pulse rounded-xl bg-surface" />
      ) : !hasAny ? (
        <div className="p-6">
          <WalletEmptyTransactions filteredEmpty={false} />
        </div>
      ) : items.length === 0 ? (
        <div className="p-6">
          <WalletEmptyTransactions filteredEmpty />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-border/60 bg-surface/40 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">{t("walletPage.transactions", { defaultValue: "Tranzaksiyalar" })}</th>
                <th className="px-5 py-3">{t("walletHistoryPage.date", { defaultValue: "Sana" })}</th>
                <th className="px-5 py-3 text-right">{t("walletPage.amount", { defaultValue: "Summa" })}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => (
                <tr
                  key={tx.id}
                  className="cursor-pointer border-b border-border/40 last:border-b-0 hover:bg-surface/40"
                  onClick={() => setSelected(tx)}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                          tx.kind === "in" ? "bg-foreground text-background" : "bg-surface text-foreground",
                        )}
                      >
                        {tx.kind === "in" ? (
                          <ArrowDownLeft className="h-4 w-4" strokeWidth={2} />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-foreground">{tx.title}</span>
                        {tx.adminAction ? (
                          <span className="ml-2 inline-flex items-center gap-0.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            <Shield className="size-2.5" />
                            Admin
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{tx.date}</td>
                  <td
                    className={cn(
                      "px-5 py-3.5 text-right font-semibold tabular-nums",
                      tx.kind === "in" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {tx.kind === "in" ? "+" : "−"}
                    {formatWalletTxAmount(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasAny && showViewAll ? (
        <div className="border-t border-border/60 px-5 py-4">
          <Link
            to="/wallet"
            search={{ section: "transactions" }}
            className="inline-flex text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            {t("walletPage.fullHistory")}
          </Link>
        </div>
      ) : null}

      <WalletTransactionReceiptSheet
        tx={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
