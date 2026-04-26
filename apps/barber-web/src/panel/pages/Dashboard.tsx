"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { LiveTimer } from "@/panel/components/LiveTimer";
import {
  CalendarClock,
  TrendingUp,
  Users,
  Star,
  Play,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useBarberOnboardingStatus } from "@/hooks/useBarberOnboardingStatus";
import { StatCard, StatusPill } from "@/adminhub-ui/barber/primitives";
import { formatUZS } from "@/adminhub-ui/barber/format";

export default function Dashboard() {
  const { bookings, startBooking, completeBooking, clients, reviews } = useApp();
  const { data: onboarding, isLoading } = useBarberOnboardingStatus(true);
  const isComplete = Boolean(onboarding?.is_complete);
  const required = (onboarding?.required_next_path || "").trim();
  const flow = (onboarding?.flow || "").toString();
  const workMode = (onboarding?.work_mode || "").toString();

  const todayBookings = bookings.filter((b) => b.date === "Today");
  const activeSession = todayBookings.find((b) => b.status === "in_progress");
  const completedCount = todayBookings.filter((b) => b.status === "completed").length;
  const earnings = todayBookings
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + b.price, 0);
  const upcomingCount = todayBookings.filter((b) => b.status === "accepted").length;
  const avgRating =
    reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / Math.max(1, reviews.length);

  if (!isLoading && !isComplete) {
    const ctaHref = required || "/salon/create";
    const ctaLabel =
      ctaHref.startsWith("/salon/create")
        ? "Salon yaratish"
        : ctaHref.startsWith("/salon/join")
          ? "Salonga qo‘shilish"
          : ctaHref.startsWith("/independent/setup")
            ? "Mustaqil setup"
            : "Setupni tugatish";

    const title =
      flow === "owner" || flow === "mybarber"
        ? "Salon hali yaratilmagan"
        : flow === "employee"
          ? "Salonga hali qo‘shilmagansiz"
          : workMode === "independent"
            ? "Mustaqil barber setup tugamagan"
            : "Profil setup tugamagan";

    const desc =
      flow === "owner" || flow === "mybarber"
        ? "Davom etish uchun salon yaratish bosqichini yakunlang."
        : flow === "employee"
          ? "Davom etish uchun salonga qo‘shiling yoki taklifni qabul qiling."
          : workMode === "independent"
            ? "Xizmatlar va ish vaqtlarini kiriting."
            : "Profil ma’lumotlarini yakunlang.";

    return (
      <div className="page-container">
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-[320px] shrink-0">
            <Image
              src="/onboarding-empty.svg"
              alt="Setup required"
              width={640}
              height={480}
              className="w-full h-auto"
              priority
            />
          </div>
          <div className="min-w-0 flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">{desc}</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-center md:justify-start">
              <Button asChild className="rounded-xl">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
              <Link href="/notifications" className="text-sm text-muted-foreground underline underline-offset-4">
                Xabarnomalarni ko‘rish
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bugun sizda {todayBookings.length} ta bron, {activeSession ? "1 ta faol seans" : "faol seans yo‘q"}.
          </p>
        </div>
      </div>

      {!isLoading && !isComplete && (
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
          <div className="size-12 rounded-full bg-foreground text-background flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Profilni to‘liq ro‘yxatdan o‘tkazing</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Mijozlar sizni topishi uchun salon yoki mustaqil profil yarating.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Davom etish
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<CalendarClock className="h-4 w-4" />}
          label="Bugungi bronlar"
          value={todayBookings.length}
          hint={`${upcomingCount} kutilmoqda`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Daromad"
          value={formatUZS(earnings)}
          hint="Bugun"
        />
        <StatCard icon={<Users className="h-4 w-4" />} label="Mijozlar" value={clients.length} />
        <StatCard
          icon={<Star className="h-4 w-4" />}
          label="O‘rtacha reyting"
          value={avgRating.toFixed(1)}
          hint={`${reviews.length} sharh`}
        />
      </div>

      {activeSession && (
        <div className="rounded-xl border border-foreground bg-foreground text-background p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="size-12 rounded-full bg-background/10 ring-2 ring-background/30 flex items-center justify-center font-semibold">
              {activeSession.clientName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider opacity-70">Faol seans</div>
              <div className="font-medium truncate">{activeSession.clientName}</div>
              <div className="text-sm opacity-80 truncate">{activeSession.service}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs opacity-70 mb-1">Elapsed</div>
              <LiveTimer startedAt={activeSession.startedAt!} className="text-2xl font-bold" />
            </div>
            <button
              type="button"
              onClick={() => completeBooking(activeSession.id)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-background text-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <CheckCircle2 className="h-4 w-4" />
              Tugatish
            </button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bugungi jadval</h2>
          <Link href="/bookings" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            Hammasi <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
          {todayBookings.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Bugun bronlar yo‘q.</div>
          ) : (
            todayBookings.map((b) => (
              <div key={b.id} className="p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="text-center w-14 shrink-0">
                  <div className="font-semibold text-foreground">{b.time}</div>
                  <div className="text-[11px] text-muted-foreground">{b.status}</div>
                </div>
                <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold">
                  {b.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{b.clientName}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.service}</div>
                </div>
                <div className="hidden sm:block text-sm font-medium">{formatUZS(b.price)}</div>
                <StatusPill status={b.status} />
                {b.status === "accepted" && (
                  <button
                    type="button"
                    onClick={() => startBooking(b.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90"
                  >
                    <Play className="h-3 w-3" />
                    Boshlash
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
