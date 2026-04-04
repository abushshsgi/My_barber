"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Scissors,
  Store,
  ChevronRight,
  UserPlus,
  Loader2,
  LayoutDashboard,
  Users,
  Settings2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SalonListApi } from "@/lib/mapSalon";

async function fetchMineSalons(): Promise<SalonListApi[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) throw new Error("Salonlar yuklanmadi");
  return res.json() as Promise<SalonListApi[]>;
}

function SalonOnboarding() {
  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-8 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-extrabold text-foreground"
        >
          Siz qaysi yo‘l bilan ishlamoqchisiz?
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-sm text-muted-foreground mt-1"
        >
          Barber mustaqil ishlashi ham mumkin, salonga ulanib ham.
        </motion.p>
      </div>

      <div className="px-5 space-y-3 pb-24">
        <Card className="p-4 rounded-2xl border border-border/60 border-accent/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Mavjud salonga qo‘shilaman</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tizimdagi salondan birini qidirib, joylashuv tekshiruvidan o‘tasiz.
              </p>
              <div className="mt-3">
                <Button asChild className="rounded-xl gold-gradient text-gold-foreground border-0 h-10">
                  <Link href="/salon/join">
                    Salonga qo‘shilish <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Store className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Salon ochmoqchiman</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Salon yaratasiz, xizmatlar qo‘shasiz va barberlarni taklif qilasiz.
              </p>
              <div className="mt-3">
                <Button asChild className="rounded-xl gold-gradient text-gold-foreground border-0 h-10">
                  <Link href="/salon/create">
                    Salon yaratish <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl border border-border/60">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Scissors className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Men barberman (mustaqil)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O‘zingiz xizmat qo‘shasiz, bron olasiz, keyin xohlasangiz salonga ham qo‘shilasiz.
              </p>
              <div className="mt-3">
                <Button asChild variant="secondary" className="rounded-xl h-10">
                  <Link href="/independent/setup">
                    Profilni sozlash <ChevronRight className="h-4 w-4 ml-1" />
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
      <div className="px-5 pt-8 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-extrabold text-foreground"
        >
          Saloningiz
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">
          Salonni boshqarish va jamoa bilan ishlash.
        </p>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {salons.map((s) => (
          <Card key={s.id} className="p-4 rounded-2xl border border-border/60">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-base">{s.name}</h2>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {s.address?.trim() || "Manzil kiritilmagan"}
                </p>
                <p className="text-xs mt-2">
                  {s.is_published === false ? (
                    <span className="text-amber-600 dark:text-amber-500">Mijozlarga hozircha ko‘rinmaydi</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-500">Mijozlarga ko‘rinadi</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button asChild size="sm" className="rounded-xl gold-gradient text-gold-foreground border-0 h-9">
                <Link href={`/salon/${s.id}`}>
                  <Settings2 className="h-4 w-4 mr-1.5" />
                  Salon ichiga kirish
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="rounded-xl h-9">
                <Link href="/">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Dashboard
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary" className="rounded-xl h-9">
                <Link href="/team">
                  <Users className="h-4 w-4 mr-1.5" />
                  Jamoa
                </Link>
              </Button>
            </div>
          </Card>
        ))}

        <Card className="p-4 rounded-2xl border border-dashed border-border/80 bg-muted/20">
          <p className="text-sm font-medium text-foreground mb-2">Boshqa salon</p>
          <p className="text-xs text-muted-foreground mb-3">
            Yana bitta salon ochmoqchi bo‘lsangiz, yangi salon yarating.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-xl h-9">
            <Link href="/salon/create">
              <Store className="h-4 w-4 mr-1.5" />
              Yangi salon yaratish
            </Link>
          </Button>
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center bg-background">
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
