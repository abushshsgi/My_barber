"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bell,
  Loader2,
  LogOut,
  MapPin,
  Scissors,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch, clearTokens } from "@/lib/api";
import { uzRegionLabel } from "@/lib/uz-regions";

type Me = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  role: string;
  region?: string;
};

type BarberProfileApi = {
  exists: boolean;
  location_text?: string;
  latitude?: string | number | null;
  longitude?: string | null;
};

async function fetchMe(): Promise<Me> {
  const res = await apiFetch("/api/v1/users/me/");
  if (!res.ok) throw new Error("Ma'lumot yuklanmadi");
  return res.json() as Promise<Me>;
}

async function fetchBarberProfile(): Promise<BarberProfileApi> {
  const res = await apiFetch("/api/v1/barber/profile/");
  if (!res.ok) throw new Error("Barber profili yuklanmadi");
  return res.json() as Promise<BarberProfileApi>;
}

export default function BarberProfilePage() {
  const router = useRouter();
  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
  });
  const { data: barberProf, isLoading: loadingProf } = useQuery({
    queryKey: ["barber", "me", "profile"],
    queryFn: fetchBarberProfile,
  });

  const loading = loadingMe || loadingProf;

  const handleLogout = () => {
    clearTokens();
    router.replace("/barber/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto space-y-4"
      >
        <div className="text-center mb-2">
          <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-3">
            <UserRound className="h-10 w-10 text-accent" />
          </div>
          <h1 className="text-xl font-bold">{me?.full_name || "Sartarosh"}</h1>
          <p className="text-sm text-muted-foreground">{me?.email}</p>
          {me?.phone ? (
            <p className="text-sm text-muted-foreground">{me.phone}</p>
          ) : null}
          {me?.region ? (
            <p className="text-xs text-muted-foreground mt-1">
              {uzRegionLabel(me.region)}
            </p>
          ) : null}
        </div>

        <Card className="p-4 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Barber profili
          </p>
          {barberProf?.exists && barberProf.location_text ? (
            <div className="flex gap-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              <span>{barberProf.location_text}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Joylashuv va xizmatlarni mustaqil barber sahifasida sozlashingiz mumkin.
            </p>
          )}
          <Button variant="outline" className="w-full rounded-xl" asChild>
            <Link href="/barber/independent/setup">
              <Scissors className="h-4 w-4 mr-2" />
              Joylashuv va xizmatlar
            </Link>
          </Button>
        </Card>

        <Card className="p-0 overflow-hidden divide-y divide-border">
          <Link
            href="/barber/notifications"
            className="flex items-center gap-3 p-4 text-sm hover:bg-muted/50 transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span>Xabarnomalar</span>
          </Link>
        </Card>

        <Button
          variant="destructive"
          className="w-full rounded-xl"
          type="button"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Chiqish
        </Button>
      </motion.div>
    </div>
  );
}
