import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Gift,
  Plus,
  Wallet as WalletIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { useWalletMe } from "@/hooks/use-wallet";
import { parseWalletBalance } from "@/lib/api/wallet";
import { formatPrice } from "@/lib/price-display";
import { WALLET_HUB_LINKS } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

export function WalletDesktopAside() {
  const { t } = useTranslation();
  const { data: wallet } = useWalletMe();
  const balance = wallet ? parseWalletBalance(wallet.balance) : 0;

  return (
    <aside className="space-y-6">
      <section className={cn(DESKTOP_GLASS_PANEL, "p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("walletPage.savedCards")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("walletPage.savedCardsHint")}</p>
          </div>
          <Link
            to="/wallet"
            search={{ section: "payments" }}
            className="shrink-0 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
          >
            {t("walletPage.manageCards")}
          </Link>
        </div>

        {wallet ? (
          <Link
            to="/wallet"
            search={{ section: "payments" }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-foreground/15 bg-surface/80 p-4 transition-colors hover:bg-surface"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-background ring-1 ring-border/60">
              <WalletIcon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{wallet.card.card_display}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{formatPrice(balance)}</p>
            </div>
            <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase text-background">
              {t("paymentMethods.primary")}
            </span>
          </Link>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface/40 p-4 text-center text-xs text-muted-foreground">
            {t("walletPage.noCard", { defaultValue: "Karta ulanmagan" })}
          </div>
        )}

        <Link
          to="/wallet"
          search={{ section: "payments" }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-surface/80"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          {t("paymentMethods.add")}
        </Link>
      </section>

      <section className={cn(DESKTOP_GLASS_PANEL, "p-5")}>
        <h3 className="text-sm font-semibold text-foreground">
          {t("walletPage.moreServices", { defaultValue: "Hamyon va to'lov" })}
        </h3>
        <ul className="mt-3 divide-y divide-border/60">
          {WALLET_HUB_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.section}>
                <Link
                  to="/wallet"
                  search={{ section: item.section }}
                  className="group flex items-center gap-3 py-3 transition-colors hover:text-foreground"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface ring-1 ring-border/50">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium">
                    {t(item.labelKey, { defaultValue: item.defaultLabel })}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
