import { Link, useRouterState } from "@tanstack/react-router";
import {
  Award,
  Bell,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  Gift,
  Heart,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MapPin,
  Repeat,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DESKTOP_GLASS_PANEL } from "@/components/desktop/ui/desktop-glass";
import { cn } from "@/lib/utils";

export type ProfileNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
};

type NavDef = {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
  badgeFromNotifications?: boolean;
};

const MAIN_NAV: NavDef[] = [
  { to: "/profile", icon: LayoutGrid, labelKey: "profile.desktop.overview", defaultLabel: "Umumiy" },
  { to: "/bookings", icon: CalendarCheck, labelKey: "profile.bookings", defaultLabel: "Buyurtmalar" },
  { to: "/wallet", icon: Wallet, labelKey: "profile.wallet", defaultLabel: "Hamyon" },
  { to: "/addresses", icon: MapPin, labelKey: "profile.addresses", defaultLabel: "Manzillar" },
  { to: "/favorites", icon: Heart, labelKey: "favorites.title", defaultLabel: "Sevimlilar" },
  {
    to: "/notifications",
    icon: Bell,
    labelKey: "notifications.title",
    defaultLabel: "Bildirishnomalar",
    badgeFromNotifications: true,
  },
  { to: "/settings", icon: Settings, labelKey: "profile.settings", defaultLabel: "Sozlamalar" },
];

const MORE_NAV: NavDef[] = [
  { to: "/reviews", icon: Star, labelKey: "reviews.title", defaultLabel: "Sharhlar" },
  { to: "/favorite-stylists", icon: Award, labelKey: "favoriteStylists.title", defaultLabel: "Ustalar" },
  { to: "/giftcard", icon: Gift, labelKey: "profile.giftcard", defaultLabel: "Sovg'a karta" },
  { to: "/loyalty", icon: Sparkles, labelKey: "profile.loyalty", defaultLabel: "Bonus" },
  { to: "/payment-methods", icon: CreditCard, labelKey: "paymentMethods.title", defaultLabel: "To'lov" },
  { to: "/offers", icon: Tag, labelKey: "profile.offers", defaultLabel: "Aksiyalar" },
  { to: "/subscriptions", icon: Repeat, labelKey: "subscriptions.title", defaultLabel: "Obuna" },
  { to: "/family", icon: Users, labelKey: "family.title", defaultLabel: "Oila" },
  { to: "/support", icon: HelpCircle, labelKey: "profile.support", defaultLabel: "Yordam" },
  { to: "/privacy", icon: Shield, labelKey: "profile.privacy", defaultLabel: "Maxfiylik" },
];

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

function isActive(pathname: string, to: string) {
  if (to === "/profile") return pathname === "/profile";
  return pathname === to || pathname.startsWith(`${to}/`);
}

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
  const moreActive = useMemo(() => MORE_NAV.some((item) => isActive(pathname, item.to)), [pathname]);
  const [moreOpen, setMoreOpen] = useState(moreActive);

  useEffect(() => {
    if (moreActive) setMoreOpen(true);
  }, [moreActive]);

  const toItem = (def: NavDef): ProfileNavItem => ({
    to: def.to,
    icon: def.icon,
    label: t(def.labelKey, { defaultValue: def.defaultLabel }),
    badge: def.badgeFromNotifications && unreadNotifications > 0 ? unreadNotifications : undefined,
  });

  return (
    <aside className="sticky top-24 w-full shrink-0 lg:w-[240px]">
      <div className={cn(DESKTOP_GLASS_PANEL, "overflow-hidden")}>
        <div className="flex items-center gap-3 border-b border-border/40 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-background/80 text-sm font-bold ring-1 ring-border/50">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{phone}</p>
          </div>
          <Link
            to="/settings"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
            title={t("profile.editProfile", { defaultValue: "Profilni tahrirlash" })}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        {(audienceLabel || regionLabel) && (
          <div className="flex flex-wrap gap-1.5 border-b border-border/40 px-4 py-2.5">
            <span className="rounded-md bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {audienceLabel}
            </span>
            {regionLabel ? (
              <span className="rounded-md bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {regionLabel}
              </span>
            ) : null}
          </div>
        )}

        <nav className="p-2" aria-label={t("profile.title", { defaultValue: "Profil" })}>
          <ul className="space-y-0.5">
            {MAIN_NAV.map((def) => (
              <SidebarLink
                key={def.to}
                item={toItem(def)}
                active={isActive(pathname, def.to)}
              />
            ))}
          </ul>

          <div className="mt-1 border-t border-border/40 pt-1">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors",
                moreActive ? "text-foreground" : "text-muted-foreground hover:bg-background/55 hover:text-foreground",
              )}
            >
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 transition-transform", moreOpen && "rotate-180")}
              />
              <span>{t("profile.desktop.moreNav", { defaultValue: "Yana" })}</span>
            </button>
            {moreOpen ? (
              <ul className="mt-0.5 space-y-0.5 pb-1">
                {MORE_NAV.map((def) => (
                  <SidebarLink
                    key={def.to}
                    item={toItem(def)}
                    active={isActive(pathname, def.to)}
                    compact
                  />
                ))}
              </ul>
            ) : null}
          </div>
        </nav>

        <div className="border-t border-border/40 p-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-background/55 hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {t("common.logout")}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  active,
  compact,
}: {
  item: ProfileNavItem;
  active?: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.to as never}
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-sm font-semibold transition-colors",
          compact ? "py-1.5 pl-9 pr-3" : "px-3 py-2",
          active
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-background/55 hover:text-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.1 : 1.9} />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge ? (
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
              active ? "bg-background text-foreground" : "bg-foreground text-background",
            )}
          >
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
