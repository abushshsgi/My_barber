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

const MOBILE_GROUPS: Array<{
  id: string;
  title: string;
  ids: SettingsSection[];
}> = [
  {
    id: "account",
    title: "Hisob",
    ids: ["personal", "security", "privacy"],
  },
  {
    id: "prefs",
    title: "Afzalliklar",
    ids: ["notifications", "preferences"],
  },
  {
    id: "billing",
    title: "To'lov va obuna",
    ids: ["payments", "subscriptions"],
  },
  {
    id: "more",
    title: "Boshqa",
    ids: ["addresses", "family", "help"],
  },
];

export function SettingsAirbnbSidebar({ active, t, compact, large, mobileList }: Props) {
  if (mobileList) {
    const byId = Object.fromEntries(SETTINGS_NAV.map((item) => [item.id, item]));

    return (
      <nav aria-label={t("settings.pageTitle")} className="space-y-5 px-4 pb-6 pt-3">
        {MOBILE_GROUPS.map((group) => {
          const items = group.ids.map((id) => byId[id]).filter(Boolean);
          if (items.length === 0) return null;
          return (
            <section key={group.id}>
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {group.title}
              </p>
              <ul className="overflow-hidden rounded-2xl bg-surface/80">
                {items.map((item, index) => {
                  const Icon = item.icon;
                  const label = t(item.labelKey, { defaultValue: item.defaultLabel });
                  const isLast = index === items.length - 1;
                  return (
                    <li key={item.id}>
                      <Link
                        to="/settings"
                        search={{ section: item.id }}
                        className="flex items-center gap-3 px-3.5 py-3.5 transition-colors active:bg-background/70"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2.1} />
                        </div>
                        <div
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 py-0.5",
                            !isLast && "border-b border-border",
                          )}
                        >
                          <span className="min-w-0 flex-1 text-[15px] font-bold leading-tight">
                            {label}
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
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
