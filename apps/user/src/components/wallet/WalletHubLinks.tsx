import { Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard, Gift, Repeat, Sparkles, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/payment-methods", icon: CreditCard, labelKey: "paymentMethods.title", defaultLabel: "To'lov usullari" },
  { to: "/loyalty", icon: Sparkles, labelKey: "profile.loyalty", defaultLabel: "Bonus dasturi" },
  { to: "/giftcard", icon: Gift, labelKey: "profile.giftcard", defaultLabel: "Sovg'a karta" },
  { to: "/offers", icon: Tag, labelKey: "profile.offers", defaultLabel: "Aksiyalar" },
  { to: "/subscriptions", icon: Repeat, labelKey: "subscriptions.title", defaultLabel: "Obunalar" },
] as const;

type Props = {
  className?: string;
  compact?: boolean;
};

export function WalletHubLinks({ className, compact }: Props) {
  const { t } = useTranslation();

  return (
    <ProfileSubpageCard className={cn("overflow-hidden p-0", className)}>
      {LINKS.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 px-4 transition-colors hover:bg-surface/80",
              compact ? "py-3" : "py-3.5",
              index < LINKS.length - 1 && "border-b border-border",
            )}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface">
              <Icon className="h-4 w-4" strokeWidth={1.9} />
            </div>
            <span className="min-w-0 flex-1 text-sm font-bold">
              {t(item.labelKey, { defaultValue: item.defaultLabel })}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        );
      })}
    </ProfileSubpageCard>
  );
}
