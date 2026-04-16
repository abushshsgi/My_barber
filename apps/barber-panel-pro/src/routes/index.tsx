import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { BookingCard } from "@/components/booking-card";
import { TrendingUp, CheckCircle2, DollarSign, Calendar } from "lucide-react";
import { useBookings } from "@/lib/booking-queries";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="mt-2 text-display text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function DashboardPage() {
  const q = useBookings();
  const bookings = q.data ?? [];
  const activeSession = bookings.find((b) => b.status === "in_progress");
  const completed = bookings.filter((b) => b.status === "completed");
  const earnings = completed.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Bookings" value={q.isLoading ? "…" : String(bookings.length)} icon={Calendar} />
          <StatCard label="Completed" value={String(completed.length)} icon={CheckCircle2} />
          <StatCard label="Earnings" value={`$${earnings}`} icon={DollarSign} />
          <StatCard
            label="Completion Rate"
            value={bookings.length ? `${Math.round((completed.length / bookings.length) * 100)}%` : "0%"}
            icon={TrendingUp}
          />
        </div>

        {activeSession && (
          <div className="mt-6">
            <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Active Session</h2>
            <BookingCard booking={activeSession} />
          </div>
        )}

        <div className="mt-6">
          <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Schedule</h2>
          <div className="grid gap-3">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
