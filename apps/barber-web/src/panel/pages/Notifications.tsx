"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Bell, CalendarClock, Star, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { notifications, markNotificationRead } = useApp();
  const unread = notifications.filter((n) => !n.read).length;

  // Backend notification object doesn't contain "kind".
  // We'll infer a kind for icon purposes.
  const inferKind = (title: string, body: string): keyof typeof ICONS => {
    const t = `${title} ${body}`.toLowerCase();
    if (t.includes("bron") || t.includes("booking")) return "booking";
    if (t.includes("sharh") || t.includes("review") || t.includes("yulduz")) return "review";
    if (t.includes("chat") || t.includes("xabar") || t.includes("message")) return "chat";
    return "system";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Bildirishnomalar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {unread > 0 ? `${unread} ta o‘qilmagan` : "Barchasi o‘qildi"}
          </p>
        </div>
        <Bell className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Bildirishnomalar yo‘q.
          </div>
        ) : (
          notifications.map((n) => {
            const kind = inferKind(n.title, n.description);
            const Icon = ICONS[kind] ?? Bell;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => (!n.read ? void markNotificationRead(n.id) : undefined)}
                className={cn(
                  "w-full text-left rounded-xl border bg-card p-4 flex gap-3 transition-colors hover:bg-muted/40",
                  n.read ? "border-border" : "border-foreground/30 bg-card"
                )}
              >
                <div
                  className={cn(
                    "size-10 rounded-full flex items-center justify-center shrink-0",
                    n.read ? "bg-muted text-muted-foreground" : "bg-foreground text-background"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{n.title}</div>
                    {!n.read && <span className="size-2 rounded-full bg-foreground" />}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{n.description}</div>
                  <div className="text-xs text-muted-foreground/70 mt-1.5">{n.time}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const ICONS = {
  booking: CalendarClock,
  review: Star,
  chat: MessageSquare,
  system: SettingsIcon,
} as const;
