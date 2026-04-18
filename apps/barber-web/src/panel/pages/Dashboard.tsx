"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { LiveTimer } from "@/panel/components/LiveTimer";
import { Play, CheckCircle, Clock, DollarSign, Calendar } from "lucide-react";

export default function Dashboard() {
  const { bookings, startBooking, completeBooking } = useApp();

  const todayBookings = bookings.filter((b) => b.date === "Today");
  const activeSession = todayBookings.find((b) => b.status === "in_progress");
  const completedCount = todayBookings.filter((b) => b.status === "completed").length;
  const earnings = todayBookings.filter((b) => b.status === "completed").reduce((s, b) => s + b.price, 0);
  const upcomingCount = todayBookings.filter((b) => b.status === "accepted").length;

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your day</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Upcoming</span>
          </div>
          <p className="text-2xl font-bold">{upcomingCount}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold">{completedCount}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Earnings</span>
          </div>
          <p className="text-2xl font-bold">${earnings}</p>
        </div>
      </div>

      {/* Active Session */}
      {activeSession && (
        <div className="glass-card p-5 border-foreground/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active Session</p>
              <p className="font-semibold text-lg">{activeSession.clientName}</p>
              <p className="text-sm text-muted-foreground">{activeSession.service}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Elapsed</p>
                <LiveTimer startedAt={activeSession.startedAt!} className="text-2xl font-bold" />
              </div>
              <button
                onClick={() => completeBooking(activeSession.id)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Bookings */}
      <div>
        <h2 className="section-title mb-3">Today's Bookings</h2>
        <div className="space-y-2">
          {todayBookings.map((booking) => (
            <div key={booking.id} className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-sm font-medium">{booking.clientName.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">{booking.clientName}</p>
                  <p className="text-xs text-muted-foreground">{booking.service} · {booking.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {booking.status === "in_progress" && booking.startedAt && (
                  <LiveTimer startedAt={booking.startedAt} className="text-sm text-muted-foreground" />
                )}
                <span className={`status-${booking.status === "in_progress" ? "in-progress" : booking.status}`}>
                  {booking.status === "in_progress" ? "In Progress" : booking.status === "accepted" ? "Accepted" : "Completed"}
                </span>
                {booking.status === "accepted" && (
                  <button
                    onClick={() => startBooking(booking.id)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <Play className="h-3 w-3" />
                    Start
                  </button>
                )}
                {booking.status === "in_progress" && (
                  <button
                    onClick={() => completeBooking(booking.id)}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
