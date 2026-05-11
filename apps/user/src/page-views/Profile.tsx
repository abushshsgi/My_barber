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
import { Link } from "@/navigation";
import { apiFetch, clearTokens } from "@/lib/api";
import { fetchMySalons } from "@/lib/salon-queries";
import { mapSalonListApi } from "@/lib/mapSalon";
import { useRouter } from "@/navigation";
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
  { label: "Band tarixi", icon: CalendarDays, color: "text-teal", href: "/bookings" },
  { label: "Yozilgan sharhlar", icon: Star, color: "text-gold", href: "/bookings" },
  { label: "Sevimlilar", icon: Heart, color: "text-destructive", href: "/map" },
  { label: "Maxfiylik", icon: Shield, color: "text-success", href: "/profile" },
  { label: "Yordam", icon: HelpCircle, color: "text-muted-foreground", href: "/profile" },
  { label: "Sozlamalar", icon: Settings, color: "text-muted-foreground", href: "/profile" },
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background gap-4">
        <p className="text-muted-foreground text-center">Tizimga kiring</p>
        <Link to="/auth">
          <Button className="h-11 rounded-2xl border-0 bg-primary text-base font-semibold text-primary-foreground shadow-luxury">
            Kirish
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = user.full_name || user.email;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden rounded-b-[32px] dark-gradient text-background">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-gold/40 blur-3xl" />
          <div className="absolute top-20 -left-10 h-32 w-32 rounded-full bg-teal/30 blur-3xl" />
        </div>

        <div className="relative px-5 pt-12 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="relative">
              <div className="grid h-[72px] w-[72px] place-items-center rounded-2xl bg-background/10 text-xl font-bold text-background ring-2 ring-gold/40 ring-offset-2 ring-offset-foreground">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
              <button
                type="button"
                aria-label="Profilni tahrirlash"
                className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-lg gold-gradient shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <Edit3 className="h-3 w-3 text-gold-foreground" />
              </button>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-extrabold leading-tight text-background">
                {displayName}
              </h1>
              <p className="mt-0.5 truncate text-sm text-background/60">{user.phone || "—"}</p>
              <p className="truncate text-xs text-background/45">{user.email}</p>
              {user.region ? (
                <p className="mt-1 text-xs text-background/40">{uzRegionLabel(user.region)}</p>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-5 -mt-6"
      >
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: bookingCount, label: "Bandlar", icon: CalendarDays, tone: "text-foreground" },
            { value: reviewCount, label: "Sharhlar", icon: Star, tone: "text-gold" },
            { value: "—", label: "Sevimli", icon: Heart, tone: "text-destructive" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="rounded-2xl border border-border/60 bg-surface p-3.5 text-center shadow-card"
            >
              <stat.icon className={`mx-auto mb-1.5 h-5 w-5 ${stat.tone}`} />
              <p className="font-display text-xl font-extrabold text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="px-5 mt-4"
      >
        {reviewCount > 0 ? (
          <Link
            to="/bookings"
            className="block cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-soft outline-none transition hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-muted">
                <Star className="h-6 w-6 text-gold" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="label-eyebrow">Sharhlaringiz</p>
                <p className="text-base font-semibold text-foreground">{reviewCount} ta yozilgan sharh</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Batafsil bandlar tarixida — salon yoki barber nomi bilan.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-4 text-center">
            <p className="text-sm font-semibold text-foreground">Hali sharh yoʻq</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Band tugagach salon yoki barber uchun sharh yozishingiz mumkin.
            </p>
            <Link to="/" className="mt-3 inline-flex text-xs font-semibold text-foreground underline">
              Salonlarni ochish
            </Link>
          </div>
        )}
      </motion.div>

      {isBarberRole && mySalons.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="px-5 mt-5"
        >
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <p className="font-semibold text-sm">Salon ulanmagan</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Siz sartarosh akkauntidasiz, lekin hali salon yaratmagan yoki mavjud salonga qo‘shilmagansiz.
              Salon bilan ishlash uchun salon yarating yoki admin orqali salonga ulanib oling.
            </p>
            <div className="mt-3">
              <Button className="h-10 rounded-2xl border-0 bg-primary text-sm font-semibold text-primary-foreground shadow-luxury" asChild>
                <a href={barberWebUrl("/salon/join")}>Salonga qo‘shilish / yaratish</a>
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {isEndUser && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="px-5 mt-5"
        >
          <Link to="/map">
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
          <div className="space-y-2 mb-3">
            {mySalons.map((s) => (
              <div key={s.id} className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                  <Scissors className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{s.address || "Manzil"}</p>
                </div>
              </div>
            ))}
          </div>
          <Button className="h-10 w-full rounded-2xl border-0 bg-primary text-sm font-semibold text-primary-foreground shadow-luxury" asChild>
            <a href={barberWebUrl("/")}>Salon boshqaruvini ochish</a>
          </Button>
        </motion.div>
      )}

      {isBarberRole && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="px-5 mt-5"
        >
          <a href={barberWebUrl("/")} className="block">
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-4 transition-colors hover:bg-muted/40">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Sartarosh paneli</p>
                <p className="text-xs text-muted-foreground">Dashboard, salon, mijozlar</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </a>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="px-5 mt-6"
      >
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/50">
          <Link to="/notifications">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 }}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-foreground">
                Xabarnomalar
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
            </motion.div>
          </Link>
          {menuItems.map((item, i) => (
            <Link key={item.label} to={item.href}>
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
