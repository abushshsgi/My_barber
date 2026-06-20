import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarCheck, LayoutGrid, LogOut, MapPin, Pencil, Wallet, type LucideIcon } from "lucide-react";
import { DESKTOP_GLASS_CARD, DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { ACCOUNT_HUBS, resolveHubItems } from "@/lib/account-hubs";
import { cn } from "@/lib/utils";

export type ProfileNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type Props = {
  name: string;
  phone: string;
  initials: string;
  audienceLabel: string;
  regionLabel?: string;
  onLogout: () => void;
  unreadNotifications?: number;
  t: (key: string, opts?: { defaultValue?: string }) => string;
};

export function ProfileDesktopSidebar({
  name,
  phone,
  initials,
  audienceLabel,
  regionLabel,
  onLogout,
  unreadNotifications = 0,
  t,
}: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const primaryNav: ProfileNavItem[] = [
    { to: "/profile", label: t("profile.desktop.overview", { defaultValue: "Umumiy" }), icon: LayoutGrid },
    { to: "/bookings", label: t("profile.bookings"), icon: CalendarCheck },
    { to: "/wallet", label: t("profile.wallet"), icon: Wallet },
    { to: "/addresses", label: t("profile.addresses"), icon: MapPin },
  ];

  return (
    <aside className="sticky top-24 w-full shrink-0 lg:w-[268px]">
      <div className={cn(DESKTOP_GLASS_PANEL, "p-5")}>
        <div className="flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-background/80 ring-2 ring-border/40 backdrop-blur-sm">
            <span className="text-2xl font-bold tracking-tight">{initials}</span>
          </div>
          <p className="mt-4 max-w-full truncate text-base font-bold tracking-tight">{name}</p>
          <p className="mt-0.5 max-w-full truncate text-sm text-muted-foreground">{phone}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
              {audienceLabel}
            </span>
            {regionLabel ? (
              <span className="rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground backdrop-blur-sm">
                {regionLabel}
              </span>
            ) : null}
          </div>
          <Link
            to="/settings"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3.5 py-1.5 text-xs font-bold backdrop-blur-sm transition-colors hover:bg-background/90"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("profile.editProfile", { defaultValue: "Profilni tahrirlash" })}
          </Link>
        </div>
      </div>

      <nav className="mt-5 space-y-5" aria-label={t("profile.title", { defaultValue: "Profil" })}>
        <div>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("profile.desktop.primaryNav", { defaultValue: "Asosiy" })}
          </p>
          <ul className="space-y-0.5">
            {primaryNav.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                active={item.to === "/profile" ? pathname === "/profile" : pathname === item.to || pathname.startsWith(`${item.to}/`)}
              />
            ))}
          </ul>
        </div>

        {ACCOUNT_HUBS.map((hub) => {
          const items = resolveHubItems(hub, t);
          return (
            <div key={hub.key}>
              <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {t(hub.titleKey)}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const badge =
                    item.to === "/notifications" && unreadNotifications > 0
                      ? unreadNotifications
                      : item.badge
                        ? Number(item.badge)
                        : undefined;
                  return (
                    <SidebarLink
                      key={item.to}
                      item={{ to: item.to, label: item.label, icon: item.icon, badge }}
                      active={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                    />
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className={cn(
          DESKTOP_GLASS_CARD,
          "mt-5 flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground",
        )}
      >
        <LogOut className="h-4 w-4" />
        {t("common.logout")}
      </button>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: ProfileNavItem; active?: boolean }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to as never}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
          active
            ? "border border-border/50 bg-background/85 text-foreground shadow-sm backdrop-blur-md"
            : "text-muted-foreground hover:bg-background/55 hover:text-foreground",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
