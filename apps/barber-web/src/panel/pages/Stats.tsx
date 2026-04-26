"use client";

import { BarChart3, Users, Wallet, Star } from "lucide-react";
import { useMemo } from "react";
import { useApp } from "@/panel/contexts/AppContext";
import { PageHeader, SectionCard, StatCard } from "@/adminhub-ui/barber/primitives";
import { formatUZS } from "@/adminhub-ui/barber/format";

export default function StatsPage() {
  const { bookings, clients, reviews } = useApp();

  const { earnings, completedCount, avgRating } = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed");
    const sum = completed.reduce((s, b) => s + (Number(b.price) || 0), 0);
    const avg =
      reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / Math.max(1, reviews.length);
    return { earnings: sum, completedCount: completed.length, avgRating: avg };
  }, [bookings, reviews]);

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Statistika" description="Asosiy KPI va natijalar." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Wallet className="h-4 w-4" />} label="Daromad" value={formatUZS(earnings)} hint="Completed bookings" />
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Yakunlangan" value={completedCount} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Mijozlar" value={clients.length} />
        <StatCard icon={<Star className="h-4 w-4" />} label="Reyting" value={avgRating.toFixed(1)} hint={`${reviews.length} sharh`} />
      </div>

      <SectionCard title="Analytics" description="Grafiklar va vaqt bo‘yicha kesimlar (keyingi bosqich).">
        <div className="text-sm text-muted-foreground">
          Hozir sizning backend’da mavjud bo‘lgan analytics endpointlar asosan client list uchun
          (`/api/v1/analytics/clients/...`). Vaqt bo‘yicha revenue/booking analytics uchun yangi API kerak bo‘ladi.
        </div>
      </SectionCard>
    </div>
  );
}

