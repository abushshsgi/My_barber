import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CircleUser,
  LayoutDashboard,
  MessageSquareText,
  Star,
  Store,
  UserPlus,
  Users,
  Scissors,
} from "lucide-react";

export type BarberNavItem = { icon: LucideIcon; label: string; path: string };

/** Salon / jamoa asosidagi sartaroshlar */
export const BARBER_NAV: BarberNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Store, label: "Salon", path: "/salon" },
  { icon: Users, label: "Mijozlar", path: "/clients" },
  { icon: MessageSquareText, label: "Chat", path: "/chat" },
  { icon: Star, label: "Sharhlar", path: "/reviews" },
  { icon: UserPlus, label: "Jamoa", path: "/team" },
  { icon: CircleUser, label: "Profil", path: "/profile" },
];

/** Mustaqil barber: salon va jamoa bo‘limlari o‘rniga xizmatlar sozlamasi */
export const BARBER_NAV_INDEPENDENT: BarberNavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CalendarClock, label: "Bronlar", path: "/bookings" },
  { icon: Scissors, label: "Xizmatlar", path: "/independent/setup" },
  { icon: Users, label: "Mijozlar", path: "/clients" },
  { icon: MessageSquareText, label: "Chat", path: "/chat" },
  { icon: Star, label: "Sharhlar", path: "/reviews" },
  { icon: CircleUser, label: "Profil", path: "/profile" },
];

export function barberNavFor(workMode?: string | null): BarberNavItem[] {
  return workMode === "independent" ? BARBER_NAV_INDEPENDENT : BARBER_NAV;
}

export function barberPageTitle(pathname: string, workMode?: string | null): string {
  const nav = barberNavFor(workMode);
  const match = nav.find((n) =>
    n.path === "/"
      ? pathname === "/"
      : pathname === n.path || pathname.startsWith(`${n.path}/`),
  );
  return match?.label ?? "MyBarber";
}
