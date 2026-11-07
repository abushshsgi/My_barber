import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  ChevronLeft,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  HelpCircle,
  LayoutGrid,
  Plus,
  QrCode,
  Receipt,
  Snowflake,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { mobileBackButtonClass } from "@/components/mobile/MobileBackButton";
import { WalletEmptyTransactions } from "@/components/wallet/WalletEmptyTransactions";
import { WalletPullRefresh } from "@/components/wallet/WalletPullRefresh";
import { WalletTransactionList } from "@/components/wallet/WalletTransactionList";
import { useDisplayUser } from "@/hooks/use-me";
import { useWalletMe, useWalletTransactions, walletMeQueryKeyFor } from "@/hooks/use-wallet";
import { setWalletFreeze } from "@/lib/api/wallet";
import { getAuthUserId } from "@/lib/auth-user";
import { formatPrice } from "@/lib/mock-data";
import {
  filterWalletTransactions,
  withoutTopups,
  type WalletTxTab,
} from "@/lib/wallet-transactions";
import { cn } from "@/lib/utils";

const RECENT_TX_LIMIT = 8;

type View = "home" | "more" | "faq" | "card" | "freeze";

/** Ilova hamyon bosh sahifasi: balans, 4 amal, tarix, ko‘proq (rekvizit, muzlatish, FAQ). */
export function WalletMobileOverview() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useDisplayUser();
  const meQ = useWalletMe();
  const [view, setView] = useState<View>("home");
  const [hidden, setHidden] = useState(false);
  const [tab, setTab] = useState<WalletTxTab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const { data: transactions = [], isLoading: txLoading } = useWalletTransactions(tab, 50);
  const frozen = Boolean(meQ.data?.is_frozen);
  const balance = Number(meQ.data?.balance ?? 0);
  const walletNumber = meQ.data?.wallet_number ?? "";

  const activity = useMemo(() => withoutTopups(transactions), [transactions]);
  const visible = useMemo(
    () => filterWalletTransactions(activity, tab).slice(0, RECENT_TX_LIMIT),
    [activity, tab],
  );
  const hasAnyTransactions = activity.length > 0;
  const greet = (user.name || "").split(/\s+/)[0] || t("walletPage.friend", { defaultValue: "do‘st" });

  const refreshBalance = async () => {
    await qc.invalidateQueries({ queryKey: walletMeQueryKeyFor(getAuthUserId()) });
    await qc.invalidateQueries({ queryKey: ["wallet", "transactions"] });
  };

  const freeze = useMutation({
    mutationFn: () =>
      setWalletFreeze(
        frozen ? "unfreeze" : "freeze",
        frozen ? "Webdan ochildi" : "Webdan muzlatildi",
      ),
    onSuccess: async () => {
      await refreshBalance();
      toast.success(
        frozen
          ? t("walletPage.unfrozen", { defaultValue: "Hamyon ochildi" })
          : t("walletPage.frozen", { defaultValue: "Hamyon muzlatildi" }),
      );
      setView("more");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("common.error", { defaultValue: "Xatolik" })),
  });

  if (view === "more") {
    return (
      <Subpage title={t("walletPage.more", { defaultValue: "Ko‘proq" })} onBack={() => setView("home")}>
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={Plus} title={t("walletPage.topUp")} to="/wallet/top-up" />
          <Tile icon={Gift} title={t("walletPage.gift")} to="/wallet" search={{ section: "gift" }} />
          <Tile icon={ArrowDownLeft} title={t("walletPage.received", { defaultValue: "Kelgan" })} to="/wallet/gifts" />
          <Tile icon={Receipt} title={t("walletPage.recent")} to="/wallet/history" />
          <button type="button" onClick={() => setView("card")} className={tileClass}>
            <CreditCard className="size-5" />
            <span>{t("walletPage.requisites", { defaultValue: "Rekvizit" })}</span>
          </button>
          <button type="button" onClick={() => setView("freeze")} className={tileClass}>
            <Snowflake className="size-5" />
            <span>
              {frozen
                ? t("walletPage.unfreeze", { defaultValue: "Muzdan ochish" })
                : t("walletPage.freeze", { defaultValue: "Muzlatish" })}
            </span>
          </button>
          <button type="button" onClick={() => setView("faq")} className={tileClass}>
            <HelpCircle className="size-5" />
            <span>FAQ</span>
          </button>
          <Tile icon={QrCode} title="QR" to="/wallet/qr-pay" />
        </div>
      </Subpage>
    );
  }

  if (view === "card") {
    return (
      <Subpage title={t("walletPage.requisites", { defaultValue: "Rekvizit" })} onBack={() => setView("more")}>
        <div className="rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("walletPage.walletNumber", { defaultValue: "Hamyon raqami" })}
          </p>
          <p className="mt-2 text-lg font-bold tracking-tight">{walletNumber || "—"}</p>
          <p className="mt-4 text-xs font-semibold text-muted-foreground">
            {t("walletPage.cardholder", { defaultValue: "Egasi" })}
          </p>
          <p className="mt-1 text-sm font-semibold">{meQ.data?.card?.cardholder_name || user.name}</p>
        </div>
      </Subpage>
    );
  }

  if (view === "faq") {
    const items = [
      {
        q: t("walletPage.faqBalanceQ", { defaultValue: "Balans qayerda ko‘rinadi?" }),
        a: t("walletPage.faqBalanceA", { defaultValue: "Bosh sahifadagi katta raqam — joriy balans." }),
      },
      {
        q: t("walletPage.faqFreezeQ", { defaultValue: "Hamyonni muzlatsam nima bo‘ladi?" }),
        a: t("walletPage.faqFreezeA", { defaultValue: "Chiqim vaqtinchalik to‘xtaydi. Istalgan vaqtda ochish mumkin." }),
      },
    ];
    return (
      <Subpage title="FAQ" onBack={() => setView("more")}>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.q} className="rounded-2xl bg-surface p-4">
              <p className="text-sm font-semibold">{item.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </Subpage>
    );
  }

  if (view === "freeze") {
    return (
      <Subpage
        title={frozen ? t("walletPage.unfreeze", { defaultValue: "Ochish" }) : t("walletPage.freeze", { defaultValue: "Muzlatish" })}
        onBack={() => setView("more")}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {frozen
            ? t("walletPage.unfreezeBody", { defaultValue: "Hamyon yana to‘lov va o‘tkazmalar uchun ochiladi." })
            : t("walletPage.freezeBody", { defaultValue: "Hamyon muzlatilsa chiqim vaqtinchalik to‘xtaydi." })}
        </p>
        <button
          type="button"
          disabled={freeze.isPending}
          onClick={() => freeze.mutate()}
          className="mt-6 w-full rounded-full bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-60"
        >
          {freeze.isPending
            ? t("common.loading", { defaultValue: "Kutilmoqda" })
            : frozen
              ? t("walletPage.unfreeze", { defaultValue: "Ochish" })
              : t("walletPage.freeze", { defaultValue: "Muzlatish" })}
        </button>
      </Subpage>
    );
  }

  const tabLabels: Record<WalletTxTab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  return (
    <WalletPullRefresh onRefresh={refreshBalance} onRefreshingChange={setRefreshing}>
      <div className={cn("overflow-x-hidden pb-6", refreshing && "opacity-80")}>
        <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
          <Link to="/profile" className={mobileBackButtonClass} aria-label={t("common.back")}>
            <ChevronLeft className="size-5" strokeWidth={2.25} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {t("walletPage.hello", { defaultValue: "Salom" })}, {greet}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {t("walletPage.welcome", { defaultValue: "Hamyoningiz" })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView("more")}
            className="grid size-10 place-items-center rounded-full bg-surface"
            aria-label={t("walletPage.more", { defaultValue: "Ko‘proq" })}
          >
            <Bell className="size-5" />
          </button>
        </header>

        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          className="mt-6 flex w-full flex-col items-center px-5"
        >
          <span className="inline-flex items-center gap-2 text-4xl font-bold tracking-tight tabular-nums">
            {meQ.isLoading ? "…" : hidden ? "••••••" : formatPrice(Number.isFinite(balance) ? balance : 0)}
            {hidden ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {t("walletPage.balance", { defaultValue: "Balans" })}
          </span>
        </button>

        <div className="mt-6 grid grid-cols-4 gap-2 px-4">
          <Action icon={ArrowUpRight} label={t("walletPage.gift")} to="/wallet" search={{ section: "gift" }} />
          <Action icon={ArrowDownLeft} label={t("walletPage.qr", { defaultValue: "To‘lov" })} to="/wallet/qr-pay" />
          <Action icon={Plus} label={t("walletPage.topUp")} to="/wallet/top-up" />
          <button type="button" onClick={() => setView("more")} className="flex flex-col items-center gap-2">
            <span className="grid size-12 place-items-center rounded-2xl bg-surface">
              <LayoutGrid className="size-5" />
            </span>
            <span className="text-center text-[10px] font-bold leading-tight">
              {t("walletPage.more", { defaultValue: "Ko‘proq" })}
            </span>
          </button>
        </div>

        <section className="mx-5 mt-8">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-bold">{t("walletPage.recent")}</h2>
            {hasAnyTransactions ? (
              <Link to="/wallet/history" className="text-[11px] font-bold text-muted-foreground">
                {t("walletPage.fullHistory")}
              </Link>
            ) : null}
          </div>
          {hasAnyTransactions ? (
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
          ) : null}
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

const tileClass =
  "flex min-h-24 flex-col items-start justify-between rounded-3xl bg-surface p-4 text-left text-sm font-semibold";

function Subpage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="px-4 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className={mobileBackButtonClass} aria-label={title}>
          <ChevronLeft className="size-5" strokeWidth={2.25} />
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Tile({
  icon: Icon,
  title,
  to,
  search,
}: {
  icon: typeof Plus;
  title: string;
  to: "/wallet" | "/wallet/top-up" | "/wallet/gifts" | "/wallet/history" | "/wallet/qr-pay";
  search?: { section: "gift" };
}) {
  return (
    <Link to={to} search={search} className={tileClass}>
      <Icon className="size-5" />
      <span>{title}</span>
    </Link>
  );
}

function Action({
  icon: Icon,
  label,
  to,
  search,
}: {
  icon: typeof Plus;
  label: string;
  to: "/wallet" | "/wallet/qr-pay" | "/wallet/top-up";
  search?: { section: "gift" };
}) {
  return (
    <Link to={to} search={search} className="flex flex-col items-center gap-2">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface">
        <Icon className="size-5" />
      </span>
      <span className="text-center text-[10px] font-bold leading-tight">{label}</span>
    </Link>
  );
}
