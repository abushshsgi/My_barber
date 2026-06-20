import { Link } from "@tanstack/react-router";
import { WALLET_NAV, type WalletSection } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

type Props = {
  active: WalletSection;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  compact?: boolean;
  large?: boolean;
};

export function WalletSectionNav({ active, t, compact, large }: Props) {
  return (
    <nav
      className={cn(compact ? "space-y-1" : large ? "space-y-1.5" : "space-y-0.5")}
      aria-label={t("walletPage.title")}
    >
      {WALLET_NAV.map((item) => {
        const Icon = item.icon;
        const label = t(item.labelKey, { defaultValue: item.defaultLabel });
        const isActive = active === item.id;

        return (
          <Link
            key={item.id}
            to="/wallet"
            search={{ section: item.id }}
            className={cn(
              "flex items-center rounded-lg font-medium transition-colors",
              large
                ? "gap-3.5 px-3.5 py-3 text-[15px] leading-snug xl:text-base"
                : "gap-3 px-3 py-3 text-sm",
              isActive
                ? "bg-surface font-semibold text-foreground"
                : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
            )}
          >
            <Icon
              className={cn("shrink-0", large ? "h-5 w-5" : "h-[18px] w-[18px]")}
              strokeWidth={1.75}
            />
            <span className="min-w-0 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
