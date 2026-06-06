import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Gift, Plus, ChevronLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PlasticCard } from "@/components/wallet/PlasticCard";
import { ClientOnly } from "@/components/ClientOnly";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletPaymentMethodsRow } from "@/components/wallet/WalletPaymentMethodsRow";
import { WalletPullRefresh } from "@/components/wallet/WalletPullRefresh";
import { loyaltyMock, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hamyon — mysaloon.uz" },
      { name: "description", content: "Cashback balansi, sovg'a kartalar va to'lov tarixi." },
    ],
  }),
  component: WalletPage,
});

type Tab = "all" | "in" | "out";

interface Tx {
  id: string;
  kind: "in" | "out";
  title: string;
  date: string;
  amount: number;
}

const MOCK_TXS: Tx[] = [
  { id: "t1", kind: "in", title: "Cashback · Modern Cuts", date: "Bugun", amount: 12000 },
  { id: "t2", kind: "out", title: "Bron · Lazzat Spa", date: "Kecha", amount: -180000 },
  { id: "t3", kind: "in", title: "Do'stni taklif qildingiz", date: "2 kun oldin", amount: 25000 },
  { id: "t4", kind: "out", title: "Sovg'a karta · Madina", date: "5 kun oldin", amount: -100000 },
  { id: "t5", kind: "in", title: "Promo · Yangi yil", date: "1 hafta", amount: 50000 },
];

function formatTxAmount(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.abs(n)) + " so'm";
}

function WalletPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("all");
  const [balance, setBalance] = useState(walletSummary.balance);
  const [transactions] = useState<Tx[]>(MOCK_TXS);
  const [refreshing, setRefreshing] = useState(false);

  const visible = transactions.filter((tx) => tab === "all" || tx.kind === tab);
  const hasAnyTransactions = transactions.length > 0;

  const cashbackTotal = useMemo(
    () => transactions.filter((tx) => tx.kind === "in").reduce((sum, tx) => sum + tx.amount, 0),
    [transactions],
  );

  const tabLabels: Record<Tab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  const refreshBalance = async () => {
    await new Promise((r) => setTimeout(r, 900));
    setBalance(walletSummary.balance);
  };

  return (
    <WalletPullRefresh onRefresh={refreshBalance} onRefreshingChange={setRefreshing}>
      <div className="overflow-x-hidden pb-6">
        <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
          <Link
            to="/profile"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface active:opacity-80"
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">{t("walletPage.title")}</h1>
            <p className="text-[11px] text-muted-foreground">{t("walletPage.pullHint")}</p>
          </div>
        </header>

        <div className="px-5 pt-2">
          <div className="relative mx-auto flex min-h-[210px] w-full max-w-[360px] items-center justify-center overflow-visible py-4">
            <ClientOnly
              fallback={
                <div className="aspect-[1.586/1] w-full max-w-[340px] animate-pulse rounded-[26px] bg-surface" />
              }
            >
              <PlasticCard
                balance={balance}
                refreshing={refreshing}
                monthTrend={t("walletPage.monthTrend")}
              />
            </ClientOnly>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-10 px-5">
          <Link to="/wallet/top-up" className="flex flex-col items-center gap-2 active:scale-95">
            <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-foreground text-background shadow-lg">
              <Plus className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold">{t("walletPage.topUp")}</span>
          </Link>
          <Link to="/giftcard" className="flex flex-col items-center gap-2 active:scale-95">
            <span className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-foreground bg-card">
              <Gift className="h-7 w-7" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-bold">{t("walletPage.gift")}</span>
          </Link>
        </div>

        <WalletPaymentMethodsRow />

        <div className="mx-5 mt-6 flex gap-3">
          <div className="flex-1 rounded-[24px] bg-surface px-4 py-3 text-center">
            <p className="text-lg font-bold tabular-nums">{Math.round(cashbackTotal / 1000)}k</p>
            <p className="text-[9px] font-bold uppercase text-muted-foreground">
              {t("walletPage.stats.cashback")}
            </p>
          </div>
          <Link
            to="/loyalty"
            className="flex-1 rounded-[24px] bg-surface px-4 py-3 text-center active:opacity-90"
          >
            <p className="text-lg font-bold tabular-nums">{loyaltyMock.points.toLocaleString()}</p>
            <p className="text-[9px] font-bold uppercase text-muted-foreground">
              {t("walletPage.stats.bonus")}
            </p>
          </Link>
        </div>

        <section className="mx-5 mt-8">
          <h2 className="text-sm font-bold">{t("walletPage.recent")}</h2>

          {hasAnyTransactions && (
            <div className="mt-3 flex gap-2">
              {(["all", "in", "out"] as Tab[]).map((k) => (
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

          {!hasAnyTransactions ? (
            <WalletEmptyTransactions filteredEmpty={false} />
          ) : visible.length === 0 ? (
            <WalletEmptyTransactions filteredEmpty />
          ) : (
            <ul className="mt-4 space-y-3">
              {visible.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 rounded-[24px] bg-surface px-4 py-4"
                >
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                      tx.kind === "in" ? "bg-foreground text-background" : "bg-background",
                    )}
                  >
                    {tx.kind === "in" ? (
                      <ArrowDownLeft className="h-5 w-5" strokeWidth={2.2} />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{tx.title}</p>
                    <p className="text-[11px] text-muted-foreground">{tx.date}</p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-[15px] font-bold tabular-nums",
                      tx.kind === "in" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {tx.kind === "in" ? "+" : "−"}
                    {formatTxAmount(tx.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {hasAnyTransactions && (
            <button
              type="button"
              className="mt-4 w-full rounded-full bg-surface py-3.5 text-[12px] font-bold active:opacity-80"
            >
              {t("walletPage.fullHistory")}
            </button>
          )}
        </section>
      </div>
    </WalletPullRefresh>
  );
}
