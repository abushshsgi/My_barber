"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Scissors,
  Store,
  ChevronRight,
  UserPlus,
  Loader2,
  LayoutDashboard,
  Users,
  Settings2,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SalonListApi } from "@/lib/mapSalon";

async function fetchMineSalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) throw new Error("Salonlar yuklanmadi");
  return res.json() as Promise<SalonListApi[]>;
}

export type SalonOnboardingProps = {
  /** Masalan dashboardda min-h-screen bo‘lmasin */
  className?: string;
  /** Sarlavha ostidagi qisqa matn */
  intro?: string;
};

export function SalonOnboarding({ className, intro }: SalonOnboardingProps) {
  return (
    <div className={cn("bg-background", className ?? "min-h-screen")}>
      <div className="px-5 pb-4 pt-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary"
        >
          Salon hali yo‘q
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-extrabold text-foreground"
        >
          Qanday ishlamoqchisiz?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mt-1 text-sm text-muted-foreground"
        >
          {intro ??
            "Salon yarating, mavjud salonga ishchi sifatida qo‘shiling, MyBarber brendi ostida oching yoki mustaqil barber sifatida ishlang."}
        </motion.p>
      </div>

      <div className="space-y-3 px-5 pb-24">
        <Card className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <Store className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Men salon egasiman</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Haqiqiy salon: nom, manzil, xarita nuqtasi va xizmatlarni o‘zingiz kiritasiz.
              </p>
              <div className="mt-3">
                <Button asChild className="h-10 rounded-xl border-0 gold-gradient text-gold-foreground">
                  <Link href="/salon/create">
                    Salon yaratish <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 border-accent/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <UserPlus className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Men salonda ishlayman</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Salondan qidirasiz; qo‘shilishda sizning joylashuvingiz salonning saqlangan nuqtasi bilan
                taxminan 100 m ichida bo‘lishi kerak.
              </p>
              <div className="mt-3">
                <Button asChild className="h-10 rounded-xl border-0 gold-gradient text-gold-foreground">
                  <Link href="/salon/join">
                    Salonga qo‘shilish <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">MyBarber bilan yangi salon</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Alohida salon binosi bo‘lmasa ham, MyBarber brendi ostida onlayn salon ochishingiz mumkin —
                nom va xizmatlar avvaldan beriladi.
              </p>
              <div className="mt-3">
                <Button asChild className="h-10 rounded-xl border-0 gold-gradient text-gold-foreground">
                  <Link href="/salon/create?preset=mybarber">
                    MyBarber salonini ochish <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <Scissors className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Faqat mustaqil barber</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Salon ochmasdan xizmat va bronlar — keyin xohlasangiz salonga qo‘shilasiz.
              </p>
              <div className="mt-3">
                <Button asChild variant="secondary" className="h-10 rounded-xl">
                  <Link href="/independent/setup">
                    Profilni sozlash <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MySalonsHub({ salons }: { salons: SalonListApi[] }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pb-4 pt-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-extrabold text-foreground"
        >
          Saloningiz
        </motion.h1>
        <p className="mt-1 text-sm text-muted-foreground">Salonni boshqarish va jamoa bilan ishlash.</p>
      </div>

      <div className="space-y-3 px-5 pb-24">
        {salons.map((s) => (
          <Card key={s.id} className="rounded-2xl border border-border/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">{s.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {s.address?.trim() || "Manzil kiritilmagan"}
                </p>
                <p className="mt-2 text-xs">
                  {s.is_published === false ? (
                    <span className="text-amber-600 dark:text-amber-500">Mijozlarga hozircha ko‘rinmaydi</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-500">Mijozlarga ko‘rinadi</span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" className="h-9 rounded-xl border-0 gold-gradient text-gold-foreground">
                <Link href={`/salon/${s.id}`}>
                  <Settings2 className="mr-1.5 h-4 w-4" />
                  Salon ichiga kirish
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="h-9 rounded-xl">
                <Link href="/">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="h-9 rounded-xl">
                <Link href="/team">
                  <Users className="mr-1.5 h-4 w-4" />
                  Jamoa
                </Link>
              </Button>
            </div>
          </Card>
        ))}

        <Card className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
          <p className="mb-2 text-sm font-medium text-foreground">Boshqa salon</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Yana bitta salon ochmoqchi bo‘lsangiz, yangi salon yarating yoki MyBarber variantidan
            foydalaning.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl">
              <Link href="/salon/create">
                <Store className="mr-1.5 h-4 w-4" />
                Yangi salon yaratish
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 rounded-xl">
              <Link href="/salon/create?preset=mybarber">
                <Sparkles className="mr-1.5 h-4 w-4" />
                MyBarber salon
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function SalonEntryChoice() {
  const { data: salons = [], isLoading, isError } = useQuery({
    queryKey: ["salons", "mine"],
    queryFn: fetchMineSalons,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-sm text-destructive">Salonlar yuklanmadi. Qayta urinib ko‘ring.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/">Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (salons.length > 0) {
    return <MySalonsHub salons={salons} />;
  }

  return <SalonOnboarding />;
}
