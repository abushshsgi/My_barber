"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Bell } from "lucide-react";
import { EmptyState } from "@/panel/components/EmptyState";

export default function Notifications() {
  const { notifications } = useApp();

  if (notifications.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Notifications</h1>
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">{notifications.filter((n) => !n.read).length} unread</p>
      </div>
      <div className="space-y-1">
        {notifications.map((n) => (
          <div key={n.id} className={`glass-card p-4 flex items-start gap-3 ${!n.read ? "border-foreground/10" : ""}`}>
            <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-foreground" : "bg-transparent"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
