import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { BookingCard } from "@/components/booking-card";
import { EmptyState } from "@/components/empty-state";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BookingStatusApi } from "@/lib/api-types";
import { useBookings } from "@/lib/booking-queries";

export const Route = createFileRoute("/bookings")({
  component: BookingsPage,
});

const tabs: { label: string; value: BookingStatusApi | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Rejected", value: "rejected" },
];

function BookingsPage() {
  const q = useBookings();
  const bookings = q.data ?? [];
  const [filter, setFilter] = useState<BookingStatusApi | "all">("all");
  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <>
      <Topbar title="Bookings" />
      <div className="p-6">
        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                filter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={q.isLoading ? "Loading..." : "No bookings"}
            description={q.isLoading ? "Please wait." : "No bookings match this filter."}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
