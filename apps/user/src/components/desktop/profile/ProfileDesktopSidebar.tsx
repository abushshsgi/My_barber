import { Link } from "@tanstack/react-router";
import { CalendarCheck, LogOut, MapPin, Pencil, Wallet, type LucideIcon } from "lucide-react";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";
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
  const primaryNav: ProfileNavItem[] = [
    {
      to: "/bookings",
      label: t("profile.bookings"),
      icon: CalendarCheck,
    },
    {
      to: "/wallet",
      label: t("profile.wallet"),
      icon: Wallet,
    },
    {
      to: "/addresses",
      label: t("profile.addresses"),
      icon: MapPin,
    },
  ];

  return (
    <aside className="sticky top-24 w-full shrink-0 lg:w-[268px]">
      <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-surface ring-2 ring-border/60">
            <span className="text-2xl font-bold tracking-tight">{initials}</span>
          </div>
          <p className="mt-4 max-w-full truncate text-base font-bold tracking-tight">{name}</p>
          <p className="mt-0.5 max-w-full truncate text-sm text-muted-foreground">{phone}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {audienceLabel}
            </span>
            {regionLabel ? (
              <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
                {regionLabel}
              </span>
            ) : null}
          </div>
          <Link
            to="/settings"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-bold transition-colors hover:bg-surface"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("profile.editProfile", { defaultValue: "Profilni tahrirlash" })}
          </Link>
        </div>
      </div>

      <nav className="mt-6 space-y-6" aria-label={t("profile.title", { defaultValue: "Profil" })}>
        <div>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("profile.desktop.primaryNav", { defaultValue: "Asosiy" })}
          </p>
          <ul className="space-y-0.5">
            {primaryNav.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            {t("account.hubMenuTitle", { defaultValue: "Bo'limlar" })}
          </p>
          <ul className="space-y-0.5">
            {ACCOUNT_HUBS.map((hub) => {
              const Icon = hub.icon;
              const badge =
                hub.key === "preferences" && unreadNotifications > 0 ? unreadNotifications : undefined;
              return (
                <li key={hub.key}>
                  <Link
                    to={hub.to as never}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors",
                      "hover:bg-surface hover:text-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                    <span className="min-w-0 flex-1 truncate">{t(hub.titleKey)}</span>
                    {badge ? (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        {t("common.logout")}
      </button>
    </aside>
  );
}

function SidebarLink({ item }: { item: ProfileNavItem }) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to as never}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors",
          "hover:bg-surface hover:text-foreground",
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
