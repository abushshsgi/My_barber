"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Scissors,
  Store,
  TrendingUp,
  Loader2,
  AlertCircle,
  Sparkles,
  MapPin,
  ExternalLink,
  Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { fetchAdminStats, type AdminRegionStatRow } from "@/lib/admin-api";
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
      label: "Sharhlar",
      value: String(data.reviews_total ?? 0),
      sub: `o‘rtacha ${data.reviews_avg ?? "0"}`,
      icon: Star,
      accent: "border-l-rose-500/70",
      iconBg: "bg-rose-500/15 text-rose-300",
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

      {data.regions && data.regions.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Viloyat bo‘yicha</h2>
          </div>
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            Har bir viloyatda nechta sartarosh va salon borligi, akkauntlar (email) va salon nomlari.
            To‘liq ro‘yxat uchun havola orqali filtrlangan sahifaga o‘ting.
          </p>
          <Card className="overflow-hidden border-border/70 p-0 card-shadow">
            <Accordion type="single" collapsible className="w-full">
              {data.regions.map((row: AdminRegionStatRow) => (
                <AccordionItem key={row.region} value={row.region} className="border-border/60 px-4">
                  <AccordionTrigger className="hover:no-underline [&[data-state=open]]:bg-muted/30">
                    <span className="flex w-full flex-wrap items-center justify-between gap-2 pr-2 text-left">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-xs font-normal tabular-nums text-muted-foreground">
                        <span className="text-foreground">{row.barbers_count}</span> sartarosh ·{" "}
                        <span className="text-foreground">{row.salons_count}</span> salon
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Sartarosh akkauntlari
                          </p>
                          <Link
                            href={`/admin/barbers?region=${encodeURIComponent(row.region)}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Ro‘yxatga o‘tish <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="max-h-56 overflow-auto rounded-lg border border-border/60">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="h-9 text-xs">Email</TableHead>
                                <TableHead className="h-9 text-xs">Ism</TableHead>
                                <TableHead className="h-9 w-20 text-center text-xs">Faol</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.barbers.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                                    Yo‘q
                                  </TableCell>
                                </TableRow>
                              ) : (
                                row.barbers.map((b) => (
                                  <TableRow key={b.id}>
                                    <TableCell className="max-w-[200px] truncate p-2 text-xs">
                                      <Link
                                        href={`/admin/barbers?q=${encodeURIComponent(b.email)}`}
                                        className="text-primary hover:underline"
                                      >
                                        {b.email}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="max-w-[120px] truncate p-2 text-xs text-muted-foreground">
                                      {b.full_name || "—"}
                                    </TableCell>
                                    <TableCell className="p-2 text-center text-xs">
                                      {b.is_active ? (
                                        <span className="text-emerald-500">ha</span>
                                      ) : (
                                        <span className="text-muted-foreground">yo‘q</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Salonlar
                          </p>
                          <Link
                            href={`/admin/salons?region=${encodeURIComponent(row.region)}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Ro‘yxatga o‘tish <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                        <div className="max-h-56 overflow-auto rounded-lg border border-border/60">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="h-9 text-xs">Salon</TableHead>
                                <TableHead className="h-9 text-xs">Ish vaqti / dam</TableHead>
                                <TableHead className="h-9 text-xs">Ega (email)</TableHead>
                                <TableHead className="h-9 w-24 text-center text-xs">Chop etilgan</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.salons.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                                    Yo‘q
                                  </TableCell>
                                </TableRow>
                              ) : (
                                row.salons.map((s) => (
                                  <TableRow key={s.id}>
                                    <TableCell className="max-w-[140px] truncate p-2 text-xs font-medium">
                                      <Link
                                        href={`/admin/salons?q=${encodeURIComponent(s.name)}`}
                                        className="text-primary hover:underline"
                                      >
                                        {s.name}
                                      </Link>
                                    </TableCell>
                                    <TableCell
                                      className="max-w-[140px] p-2 text-[10px] leading-snug text-muted-foreground"
                                      title={s.schedule_summary}
                                    >
                                      {s.schedule_summary?.trim() ? (
                                        <span className="line-clamp-2">{s.schedule_summary}</span>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                    <TableCell className="max-w-[140px] truncate p-2 text-xs text-muted-foreground">
                                      {s.owner_email || "—"}
                                    </TableCell>
                                    <TableCell className="p-2 text-center text-xs">
                                      {s.is_published ? (
                                        <span className="text-emerald-500">ha</span>
                                      ) : (
                                        <span className="text-amber-500">kutilmoqda</span>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
