import { Link } from "@tanstack/react-router";
import { SETTINGS_NAV, type SettingsSection } from "@/lib/settings-nav";
import { cn } from "@/lib/utils";

type Props = {
  active: SettingsSection;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  compact?: boolean;
  large?: boolean;
};

export function SettingsAirbnbSidebar({ active, t, compact, large }: Props) {
  return (
    <nav
      className={cn(compact ? "space-y-1" : large ? "space-y-1.5" : "space-y-0.5")}
      aria-label={t("settings.pageTitle")}
    >
      {SETTINGS_NAV.map((item) => {
        const Icon = item.icon;
        const label = t(item.labelKey, { defaultValue: item.defaultLabel });
        const isActive = active === item.id;

        return (
          <Link
            key={item.id}
            to="/settings"
            search={{ section: item.id }}
            className={cn(
              "flex items-center rounded-lg font-medium transition-colors",
              large
                ? "gap-4 px-4 py-3.5 text-[17px] leading-snug xl:py-4 xl:text-lg"
                : "gap-3 px-3 py-3 text-sm",
              isActive
                ? "bg-surface font-semibold text-foreground"
                : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
            )}
          >
            <Icon
              className={cn("shrink-0", large ? "h-[22px] w-[22px] xl:h-6 xl:w-6" : "h-[18px] w-[18px]")}
              strokeWidth={1.75}
            />
            <span className="min-w-0 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
