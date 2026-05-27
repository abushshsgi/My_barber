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
import { initials } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  { label: "Band tarixi", icon: CalendarDays, href: "/bookings" },
  { label: "Yozilgan sharhlar", icon: Star, href: "/bookings" },
  { label: "Sevimlilar", icon: Heart, href: "/favorites" },
  { label: "Maxfiylik", icon: Shield, href: "/privacy" },
  { label: "Yordam", icon: HelpCircle, href: "/support" },
  { label: "Sozlamalar", icon: Settings, href: "/settings" },
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <p className="text-center text-muted-foreground">Tizimga kiring</p>
        <Link to="/auth">
          <Button className="h-11 rounded-2xl bg-foreground text-background shadow-luxury">
            Kirish
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = user.full_name || user.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 0% 0%, oklch(0.18 0.012 60) 0%, oklch(0.08 0.005 60) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-30 texture-grid"
        />
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-40 blur-3xl"
          style={{ background: "oklch(0.78 0.13 80 / 0.5)" }}
        />

        <div className="relative px-5 pt-safe">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 pb-8 pt-6"
          >
            <div className="relative">
              <div
                className="grid h-[76px] w-[76px] place-items-center rounded-2xl text-xl font-bold text-background ring-2 ring-gold/40"
                style={{ background: "var(--gradient-gold)" }}
              >
                <span className="text-background">{initials(displayName) || "MB"}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhoneDraft(user.phone || "");
                  setNameDraft(displayName);
                  setRegionDraft(user.region || "");
                  setEditingProfile((v) => !v);
                }}
                aria-label="Tahrirlash"
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-xl bg-gold text-gold-foreground shadow-luxury"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="label-eyebrow text-white/50">Akkaunt</p>
              <h1 className="font-display truncate text-2xl font-semibold text-white tracking-tight">
                {displayName}
              </h1>
              <p className="mt-0.5 truncate text-sm text-white/60">{user.phone || "Telefon yoʻq"}</p>
              <p className="truncate text-[11px] text-white/40">{user.email}</p>
              {user.region && (
                <p className="mt-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
                  <MapPin className="mr-1 h-3 w-3" />
                  {uzRegionLabel(user.region)}
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="-mt-5 px-5">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { value: bookingCount, label: "Bandlar", Icon: CalendarDays },
            { value: reviewCount, label: "Sharhlar", Icon: Star },
            { value: favoriteCount, label: "Sevimli", Icon: Heart },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="rounded-2xl border border-border bg-surface p-3 text-center shadow-card"
            >
              <stat.Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-display text-xl font-bold text-foreground tabular-nums">
                {stat.value}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        <PwaInstallGuide />
      </div>

      {editingProfile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 px-5"
        >
          <div className="rounded-3xl border border-border bg-surface p-4 shadow-card">
            <p className="label-eyebrow">Profil</p>
            <p className="mt-0.5 font-display text-lg font-semibold text-foreground">
              Maʼlumotlarni tahrirlash
            </p>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
              Ism
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ismingiz"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-muted-foreground">
              Telefon
              <input
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                className="mt-1 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="+998 90 123 45 67"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-muted-foreground">
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
              <p className="mt-2 text-xs text-destructive">
                {(updateProfile.error as Error).message}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                className="h-11 flex-1 rounded-2xl bg-foreground text-background"
                disabled={updateProfile.isPending}
                onClick={() =>
                  updateProfile.mutate({
                    phone: phoneDraft,
                    full_name: nameDraft,
                    region: regionDraft,
                  })
                }
              >
                {updateProfile.isPending ? "Saqlanmoqda…" : "Saqlash"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-2xl"
                onClick={() => setEditingProfile(false)}
              >
                Bekor qilish
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {isEndUser && (
        <div className="mt-5 px-5">
          <Link
            to="/map"
            className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft outline-none transition hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Yaqin atrofda</p>
              <p className="text-xs text-muted-foreground">Salon va barberlarni xaritada koʻring</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}

      {/* Menu */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-5 px-5"
      >
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
          <Link
            to="/notifications"
            className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition hover:bg-muted/40"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
              <Bell className="h-4 w-4 text-foreground" />
            </span>
            <span className="flex-1 text-sm font-semibold text-foreground">Xabarnomalar</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </Link>
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex cursor-pointer items-center gap-3 border-t border-border/60 px-4 py-3.5 transition hover:bg-muted/40",
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <item.icon className="h-4 w-4 text-foreground" />
              </span>
              <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </Link>
          ))}
        </div>
      </motion.div>

      <div className="mt-5 px-5 pb-8">
        <Button
          variant="ghost"
          className="h-12 w-full rounded-2xl font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => {
            clearTokens();
            router.push("/auth");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Chiqish
        </Button>
      </div>
    </div>
  );
};

export default function ProfileWithAuth() {
  return (
    <AuthGate
      title="Profil uchun kiring"
      description="Profil, telefon va booking maʼlumotlari uchun mijoz akkaunti kerak."
    >
      <Profile />
    </AuthGate>
  );
}
