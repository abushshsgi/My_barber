import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { WALLET_HUB_LINKS } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

export function WalletDesktopAside() {
  const { t } = useTranslation();

  return (
    <aside className="space-y-6">
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
                  className="flex items-center gap-3 py-3 transition-colors hover:opacity-80"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">
                    {t(item.labelKey, { defaultValue: item.defaultLabel })}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
