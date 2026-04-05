"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Users,
  Scissors,
  Store,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { fetchAdminStats } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

const AdminDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center text-destructive">
        <AlertCircle className="h-10 w-10" />
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const stats = [
    {
      label: "Jami foydalanuvchilar",
      value: String(data.users_total),
      sub: `${data.users_clients} mijoz`,
      icon: Users,
      accent: "border-l-violet-500/70",
      iconBg: "bg-violet-500/15 text-violet-300",
    },
    {
      label: "Sartaroshlar",
      value: String(data.barbers_total),
      sub: "owner + staff",
      icon: Scissors,
      accent: "border-l-fuchsia-500/70",
      iconBg: "bg-fuchsia-500/15 text-fuchsia-300",
    },
    {
      label: "Faol salonlar",
      value: String(data.salons_published),
      sub: `${data.salons_pending_review} kutilmoqda`,
      icon: Store,
      accent: "border-l-emerald-500/70",
      iconBg: "bg-emerald-500/15 text-emerald-300",
    },
    {
      label: "Bugungi bandlar",
      value: String(data.bookings_today),
      sub: `jami ${data.bookings_total}`,
      icon: TrendingUp,
      accent: "border-l-sky-500/70",
      iconBg: "bg-sky-500/15 text-sky-300",
    },
    {
      label: "Kutilayotgan arizalar",
      value: String(data.barber_applications_pending),
      sub: "sartarosh ro'yxati",
      icon: Clock,
      accent: "border-l-amber-500/70",
      iconBg: "bg-amber-500/15 text-amber-300",
    },
  ];

  return (
    <div>
      <div className="mb-8 border-b border-border/60 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">
          Umumiy ko‘rinish
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Statistikalar REST API orqali yangilanadi (Next admin, Django admin emas).
        </p>
      </div>

      <Card className="mb-8 overflow-hidden border-dashed border-primary/25 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 p-5 card-shadow">
        <div className="flex gap-4 items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI integratsiyasi</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Hozircha chatbot yoki LLM ulangan emas. Bandlar va bildirishnomalar oddiy API orqali ishlaydi.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card
              className={cn(
                "group relative overflow-hidden border-border/70 border-l-4 p-5 transition-colors hover:border-primary/40 card-shadow",
                stat.accent
              )}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
              <div
                className={cn(
                  "relative mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-white/5",
                  stat.iconBg
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="admin-stat-mono text-3xl font-semibold tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/75">{stat.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
