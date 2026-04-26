"use client";

import { Wallet, TrendingUp, CalendarClock, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@/panel/contexts/AppContext";
import { PageHeader, SectionCard, StatCard } from "@/adminhub-ui/barber/primitives";
import { formatUZS } from "@/adminhub-ui/barber/format";

export default function EarningsPage() {
  const { bookings } = useApp();

  const { completedCount, inProgressCount, acceptedCount, earnings } = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed");
    const inProgress = bookings.filter((b) => b.status === "in_progress");
    const accepted = bookings.filter((b) => b.status === "accepted");
    const sum = completed.reduce((s, b) => s + (Number(b.price) || 0), 0);
    return {
      completedCount: completed.length,
      inProgressCount: inProgress.length,
      acceptedCount: accepted.length,
      earnings: sum,
    };
  }, [bookings]);

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Daromad" description="Yakunlangan bronlar bo‘yicha hisob." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Jami" value={formatUZS(earnings)} hint="Completed bookings" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Yakunlangan" value={completedCount} />
        <StatCard icon={<CalendarClock className="h-4 w-4" />} label="Tasdiqlangan" value={acceptedCount} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Davom etmoqda" value={inProgressCount} />
      </div>

      <SectionCard
        title="Tranzaksiyalar"
        description="Bu bo‘limni backend payout/transactions API’lari bilan ulaymiz."
      >
        <div className="text-sm text-muted-foreground">
          Hozircha `barber-web` backendida payout/transactions uchun tayyor endpoint yo‘q.
          Siz xohlasangiz, keyingi bosqichda `GET /api/v1/barber/finance/transactions/` va
          `GET /api/v1/barber/finance/payouts/` kabi API’larni dizayn qilib qo‘shamiz.
        </div>
      </SectionCard>
    </div>
  );
}

