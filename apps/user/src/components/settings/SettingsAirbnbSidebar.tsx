import { Link } from "@tanstack/react-router";
import { SETTINGS_NAV, type SettingsSection } from "@/lib/settings-nav";
import { cn } from "@/lib/utils";

type Props = {
  active: SettingsSection;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  compact?: boolean;
};

export function SettingsAirbnbSidebar({ active, t, compact }: Props) {
  return (
    <nav className={cn(compact ? "space-y-1" : "space-y-0.5")} aria-label={t("settings.pageTitle")}>
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
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-surface font-semibold text-foreground"
                : "text-muted-foreground hover:bg-surface/60 hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
