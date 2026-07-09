import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { SETTINGS_NAV, type SettingsSection } from "@/lib/settings-nav";
import { cn } from "@/lib/utils";

type Props = {
  active?: SettingsSection | null;
  t: (key: string, opts?: { defaultValue?: string }) => string;
  compact?: boolean;
  large?: boolean;
  /** Mobil — alohida sahifalar ro'yxati. */
  mobileList?: boolean;
};

export function SettingsAirbnbSidebar({ active, t, compact, large, mobileList }: Props) {
  if (mobileList) {
    return (
      <nav aria-label={t("settings.pageTitle")}>
        <ul className="divide-y divide-border">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon;
            const label = t(item.labelKey, { defaultValue: item.defaultLabel });
            return (
              <li key={item.id}>
                <Link
                  to="/settings"
                  search={{ section: item.id }}
                  className="flex items-center gap-4 px-4 py-4 transition-colors active:bg-surface/60"
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </div>
                  <span className="min-w-0 flex-1 text-sm font-bold">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

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
