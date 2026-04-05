import {
  CircleUser,
  LayoutDashboard,
  Star,
  Store,
  UserPlus,
  Users,
} from "lucide-react";

export const BARBER_NAV = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Store, label: "Salon", path: "/salon" },
  { icon: Users, label: "Mijozlar", path: "/clients" },
  { icon: Star, label: "Sharhlar", path: "/reviews" },
  { icon: UserPlus, label: "Jamoa", path: "/team" },
  { icon: CircleUser, label: "Profil", path: "/profile" },
] as const;

export function barberPageTitle(pathname: string): string {
  const match = BARBER_NAV.find((n) =>
    n.path === "/"
      ? pathname === "/"
      : pathname === n.path || pathname.startsWith(`${n.path}/`),
  );
  return match?.label ?? "MyBarber";
}
