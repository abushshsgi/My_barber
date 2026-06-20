import { Link } from "@tanstack/react-router";
import { WALLET_NAV, type WalletSection } from "@/lib/wallet-nav";
import { cn } from "@/lib/utils";

type Props = {
  active: WalletSection;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  /** Desktop: horizontal scroll pills. Mobile: vertical list. */
  horizontal?: boolean;
  compact?: boolean;
  large?: boolean;
  /** Light text on dark hero background */
  inverted?: boolean;
};

export function WalletSectionNav({ active, t, horizontal, compact, large, inverted }: Props) {
  return (
    <nav
      className={cn(
        horizontal
          ? "flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : compact
            ? "space-y-1"
            : large
              ? "space-y-1.5"
              : "space-y-0.5",
      )}
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
              "flex shrink-0 items-center font-medium transition-colors",
              horizontal
                ? cn(
                    "gap-2 rounded-full px-4 py-2.5 text-sm",
                    inverted
                      ? isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-background/70 hover:bg-background/15 hover:text-background"
                      : isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )
                : cn(
                    "rounded-lg",
                    large
                      ? "gap-3.5 px-3.5 py-3 text-[15px] leading-snug xl:text-base"
                      : "gap-3 px-3 py-3 text-sm",
                    isActive
                      ? "bg-surface font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
                  ),
            )}
          >
            <Icon
              className={cn("shrink-0", horizontal ? "h-4 w-4" : large ? "h-5 w-5" : "h-[18px] w-[18px]")}
              strokeWidth={1.75}
            />
            <span className="min-w-0 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
