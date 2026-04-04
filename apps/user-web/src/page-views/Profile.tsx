"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Settings,
  ChevronRight,
  CalendarDays,
  Star,
  LogOut,
  Heart,
  HelpCircle,
  Shield,
  Edit3,
  Loader2,
  Scissors,
  Bell,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { apiFetch, clearTokens } from "@/lib/api";
import { fetchMySalons } from "@/lib/salon-queries";
import { mapSalonListApi } from "@/lib/mapSalon";
import { useRouter } from "next/navigation";
import { uzRegionLabel } from "@/lib/uz-regions";
import { barberWebUrl } from "@/lib/public-urls";

type Me = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  region?: string;
};

async function fetchMe(): Promise<Me> {
  const res = await apiFetch("/api/v1/users/me/");
  if (!res.ok) throw new Error("Profil yuklanmadi");
  return res.json() as Promise<Me>;
}

async function fetchBookingCount(): Promise<number> {
  const res = await apiFetch("/api/v1/bookings/");
  if (!res.ok) return 0;
  const j = (await res.json()) as { count?: number; results?: unknown[] } | unknown[];
  if (Array.isArray(j)) return j.length;
  if (typeof j.count === "number") return j.count;
  return j.results?.length ?? 0;
}

async function fetchMyReviewCount(): Promise<number> {
  const res = await apiFetch("/api/v1/reviews/?mine=1");
  if (!res.ok) return 0;
  const j = (await res.json()) as { count?: number; results?: unknown[] } | unknown[];
  if (Array.isArray(j)) return j.length;
  if (typeof j.count === "number") return j.count;
  return j.results?.length ?? 0;
}

const menuItems = [
  { label: "Band tarixi", icon: CalendarDays, color: "text-accent", href: "/bookings" },
  { label: "Yozilgan sharhlar", icon: Star, color: "text-accent", href: "/bookings" },
  { label: "Sevimlilar", icon: Heart, color: "text-destructive", href: "/" },
  { label: "Maxfiylik", icon: Shield, color: "text-success", href: "/" },
  { label: "Yordam", icon: HelpCircle, color: "text-muted-foreground", href: "/" },
  { label: "Sozlamalar", icon: Settings, color: "text-muted-foreground", href: "/" },
];

const Profile = () => {
  const router = useRouter();
  const { data: user, isLoading, error } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: bookingCount = 0 } = useQuery({
    queryKey: ["bookings", "count"],
    queryFn: fetchBookingCount,
    enabled: !!user,
  });
  const { data: reviewCount = 0 } = useQuery({
    queryKey: ["reviews", "mine", "count"],
    queryFn: fetchMyReviewCount,
    enabled: !!user,
  });
  const { data: mySalonRows = [] } = useQuery({
    queryKey: ["salons", "mine"],
    queryFn: fetchMySalons,
    enabled: !!(
      user &&
      (user.role === "BARBER_OWNER" || user.role === "BARBER_STAFF")
    ),
  });
  const mySalons = mySalonRows.map(mapSalonListApi);

  const isBarberRole =
    user?.role === "BARBER_OWNER" || user?.role === "BARBER_STAFF";
  const isEndUser = user?.role === "USER";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background gap-4">
        <p className="text-muted-foreground text-center">Tizimga kiring</p>
        <Link href="/auth">
          <Button className="rounded-2xl gold-gradient text-gold-foreground border-0">Kirish</Button>
        </Link>
      </div>
    );
  }

  const displayName = user.full_name || user.email;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-accent blur-3xl" />
        </div>

        <div className="relative px-5 pt-12 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-2xl bg-muted flex items-center justify-center ring-2 ring-accent/50 ring-offset-2 ring-offset-foreground text-background font-bold text-xl">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-accent flex items-center justify-center shadow-lg"
              >
                <Edit3 className="h-3 w-3 text-accent-foreground" />
              </button>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-background">{displayName}</h1>
              <p className="text-sm text-background/50 mt-0.5">{user.phone || "—"}</p>
              <p className="text-xs text-background/40">{user.email}</p>
              {user.region ? (
                <p className="text-xs text-background/35 mt-1">{uzRegionLabel(user.region)}</p>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-5 -mt-4"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: bookingCount, label: "Bandlar", icon: CalendarDays },
            { value: reviewCount, label: "Sharhlar", icon: Star },
            { value: "—", label: "Sevimli", icon: Heart },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-card rounded-2xl p-3.5 text-center border border-border/50 shadow-sm"
            >
              <stat.icon className="h-5 w-5 mx-auto mb-1.5 text-accent" />
              <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {isEndUser && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="px-5 mt-5"
        >
          <Link href="/map">
            <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Yaqin salonlar</p>
                <p className="text-xs text-muted-foreground">Xarita orqali toping va band qiling</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}

      {isBarberRole && mySalons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-5 mt-5"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Mening salonlarim
          </p>
          <div className="space-y-2">
            {mySalons.map((s) => (
              <Link key={s.id} href={`/booking/${s.id}`}>
                <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                    <Scissors className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{s.address || "Manzil"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {isBarberRole && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="px-5 mt-5"
        >
          <Link href={barberWebUrl("/")}>
            <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3 hover:bg-muted/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Sartarosh paneli</p>
                <p className="text-xs text-muted-foreground">Dashboard, salon, mijozlar</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="px-5 mt-6"
      >
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
          <Link href="/notifications">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 }}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                <Bell className="h-4 w-4 text-accent" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                Xabarnomalar
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </motion.div>
          </Link>
          {menuItems.map((item, i) => (
            <Link key={item.label} href={item.href}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.03 }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="px-5 mt-5 pb-6">
        <Button
          variant="ghost"
          className="w-full rounded-2xl h-12 text-destructive hover:text-destructive hover:bg-destructive/10 font-medium"
          onClick={() => {
            clearTokens();
            router.push("/auth");
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Chiqish
        </Button>
      </div>
    </div>
  );
};

export default Profile;
