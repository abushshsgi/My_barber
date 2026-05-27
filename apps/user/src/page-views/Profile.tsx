"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Bell,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "@/navigation";
import { apiFetch, clearTokens, formatApiError } from "@/lib/api";
import { useRouter } from "@/navigation";
import { fetchUzRegions, uzRegionLabel } from "@/lib/uz-regions";
import { AuthGate } from "@/components/AuthGate";
import { PwaInstallGuide } from "@/components/PwaInstallGuide";
import { fetchFavoriteSalonCount } from "../lib/favorites";
import { toast } from "sonner";

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
  { label: "Sevimlilar", icon: Heart, color: "text-destructive", href: "/favorites" },
  { label: "Maxfiylik", icon: Shield, color: "text-success", href: "/privacy" },
  { label: "Yordam", icon: HelpCircle, color: "text-muted-foreground", href: "/support" },
  { label: "Sozlamalar", icon: Settings, color: "text-muted-foreground", href: "/settings" },
] as const;

const Profile = () => {
  const router = useRouter();
  const qc = useQueryClient();
  const [editingProfile, setEditingProfile] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [regionDraft, setRegionDraft] = useState("");
  const { data: user, isLoading, error } = useQuery({ queryKey: ["me"], queryFn: fetchMe });
  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchUzRegions,
    staleTime: 24 * 60 * 60 * 1000,
  });
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
  const isEndUser = user?.role === "USER";
  const { data: favoriteCount = 0 } = useQuery({
    queryKey: ["favorites", "salons", "count"],
    queryFn: fetchFavoriteSalonCount,
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (payload: { phone: string; full_name: string; region: string }) => {
      const res = await apiFetch("/api/v1/users/me/", {
        method: "PATCH",
        body: JSON.stringify({
          phone: payload.phone.trim() || null,
          full_name: payload.full_name.trim(),
          region: payload.region || "",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(body, "Profil yangilanmadi"));
      return body as Me;
    },
    onSuccess: () => {
      setEditingProfile(false);
      toast.success("Profil yangilandi");
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["me", "booking"] });
      qc.invalidateQueries({ queryKey: ["me", "indep-booking"] });
    },
  });

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
                onClick={() => {
                  setPhoneDraft(user.phone || "");
                  setNameDraft(displayName);
                  setRegionDraft(user.region || "");
                  setEditingProfile((v) => !v);
                }}
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
            { value: favoriteCount, label: "Sevimli", icon: Heart },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-card rounded-2xl p-3.5 text-center border border-border/50 shadow-sm"
            >
              <stat.icon className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
              <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="px-5 mt-4">
        <PwaInstallGuide />
      </div>

      {editingProfile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 mt-4"
        >
          <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-sm font-semibold text-foreground">Profil ma’lumotlari</p>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Ism
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ismingiz"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Telefon
              <input
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="+998 90 123 45 67"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-muted-foreground">
              Viloyat
              <select
                value={regionDraft}
                onChange={(e) => setRegionDraft(e.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Viloyat tanlanmagan</option>
                {regions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Viloyat katalog va booking hududini backend bilan bir xil tekshiradi.
            </p>
            {updateProfile.isError && (
              <p className="mt-2 text-xs text-destructive">{(updateProfile.error as Error).message}</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="h-10 flex-1 rounded-2xl bg-primary text-primary-foreground"
                disabled={updateProfile.isPending}
                onClick={() => updateProfile.mutate({ phone: phoneDraft, full_name: nameDraft, region: regionDraft })}
              >
                Saqlash
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 rounded-2xl"
                onClick={() => setEditingProfile(false)}
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </motion.div>
      )}

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

export default function ProfileWithAuth() {
  return (
    <AuthGate title="Profil uchun kiring" description="Profil, telefon va booking ma’lumotlari uchun mijoz akkaunti kerak.">
      <Profile />
    </AuthGate>
  );
}
