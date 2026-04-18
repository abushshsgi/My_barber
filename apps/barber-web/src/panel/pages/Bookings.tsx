"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { LiveTimer } from "@/panel/components/LiveTimer";
import { EmptyState } from "@/panel/components/EmptyState";
import { Play, CheckCircle, Calendar } from "lucide-react";
import { useState } from "react";
import type { BookingStatus } from "@/panel/contexts/AppContext";

const TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export default function Bookings() {
  const { bookings, startBooking, completeBooking } = useApp();
  const [activeTab, setActiveTab] = useState<BookingStatus | "all">("all");

  const filtered = activeTab === "all" ? bookings : bookings.filter((b) => b.status === activeTab);

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your appointments</p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No bookings" description="No bookings found for this filter." />
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => (
            <div key={booking.id} className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-semibold">{booking.clientName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{booking.clientName}</p>
                  <p className="text-xs text-muted-foreground">{booking.service}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{booking.time}</span>
                <span>·</span>
                <span>${booking.price}</span>
              </div>
              <div className="flex items-center gap-3">
                {booking.status === "in_progress" && booking.startedAt && (
                  <LiveTimer startedAt={booking.startedAt} className="text-sm" />
                )}
                <span className={`status-${booking.status === "in_progress" ? "in-progress" : booking.status}`}>
                  {booking.status.replace("_", " ")}
                </span>
                {booking.status === "accepted" && (
                  <button onClick={() => startBooking(booking.id)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
                    <Play className="h-3 w-3" /> Start
                  </button>
                )}
                {booking.status === "in_progress" && (
                  <button onClick={() => completeBooking(booking.id)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3" /> Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
