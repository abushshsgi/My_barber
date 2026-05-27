"use client";

import {
  Bell,
  CheckCheck,
  CheckCircle,
  Clock,
  MessageCircle,
  Star,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { fetchNotifications } from "@/lib/notifications-queries";
import type { NotifRow } from "@/lib/notifications-queries";
import { filterNotificationsByPrefs, unreadNotificationCount } from "../lib/notification-prefs";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { areNotificationAlertsEnabled } from "../lib/user-preferences";
import { Link, useRouter } from "@/navigation";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";

const iconMap: Record<string, typeof Clock> = {
  reminder_1h: Clock,
  booking_accepted: CheckCircle,
  booking_done: Star,
  booking_pending: Clock,
  booking_rejected: XCircle,
  booking_cancelled: XCircle,
  booking_started: Clock,
  chat_message: MessageCircle,
  salon_invite: Bell,
  barber_approved: CheckCircle,
  new_booking: Bell,
};

function dayLabel(date: Date): string {
  if (isToday(date)) return "Bugun";
  if (isYesterday(date)) return "Kecha";
  return format(date, "d MMMM");
}

function groupByDay(items: NotifRow[]): Array<{ key: string; date: Date; items: NotifRow[] }> {
  const groups: Array<{ key: string; date: Date; items: NotifRow[] }> = [];
  for (const n of items) {
    const d = new Date(n.created_at);
    const key = format(d, "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.date, d)) {
      last.items.push(n);
    } else {
      groups.push({ key, date: d, items: [n] });
    }
  }
  return groups;
}

const Notifications = () => {
  const qc = useQueryClient();
  const router = useRouter();
  const prefs = useUserPreferences();

  const alertsEnabled = areNotificationAlertsEnabled(prefs);
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    enabled: alertsEnabled,
  });

  const markRead = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/notifications/${id}/read/`, { method: "POST" });
      if (!res.ok) throw new Error("Xato");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/v1/notifications/mark-all-read/", { method: "POST" });
      if (!res.ok) throw new Error("Hammasini oʻqish belgilanmadi");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const visibleNotifications = filterNotificationsByPrefs(notifications, prefs);
  const unreadCount = unreadNotificationCount(notifications, prefs);
  const alertsDisabled = !alertsEnabled;

  const targetFor = (payload: Record<string, unknown> | null): string | null => {
    const conversationId = payload?.conversation_id;
    if (typeof conversationId === "string" && conversationId) return `/chat/${conversationId}`;
    const bookingId = payload?.booking_id;
    if (typeof bookingId === "number" || typeof bookingId === "string") return "/bookings";
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  const groups = groupByDay(visibleNotifications);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-5 pt-safe">
        <div className="flex items-end justify-between pt-3">
          <div>
            <p className="label-eyebrow">Inbox</p>
            <h1 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
              Xabarnomalar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} ta yangi xabar` : "Hammasi oʻqilgan"}
            </p>
          </div>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              className="grid h-9 w-9 place-items-center rounded-full bg-gold text-[12px] font-bold text-gold-foreground shadow-soft"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </div>
      </header>

      {alertsDisabled ? (
        <div className="mx-5 mt-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Xabarnomalar o‘chirilgan</p>
          <p className="mt-1 leading-relaxed">
            Booking va chat eslatmalarini qayta yoqish uchun sozlamalarga o‘ting.
          </p>
          <Link
            to="/settings"
            className="mt-3 inline-flex text-sm font-semibold text-accent underline-offset-2 hover:underline"
          >
            Sozlamalar
          </Link>
        </div>
      ) : null}

      {!alertsDisabled && unreadCount > 0 ? (
        <div className="px-5 pt-3">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            {markAllRead.isPending ? "Belgilanmoqda…" : "Hammasini oʻqilgan qilish"}
          </Button>
        </div>
      ) : null}

      <div className="px-5 pb-6 pt-5">
        {!alertsDisabled && groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-dashed border-border bg-surface py-16 text-center shadow-soft"
          >
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">Xabarlar yoʻq</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Yangi xabarlar shu yerda chiqadi
            </p>
          </motion.div>
        ) : !alertsDisabled ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="label-eyebrow mb-2 px-1">{dayLabel(group.date)}</h2>
                <div className="space-y-2">
                  <AnimatePresence>
                    {group.items.map((notif, i) => {
                      const Icon = iconMap[notif.type] ?? Bell;
                      const read = !!notif.read_at;
                      return (
                        <motion.button
                          type="button"
                          key={notif.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 60, height: 0 }}
                          transition={{ delay: i * 0.025 }}
                          layout
                          onClick={() => {
                            if (!read) markRead.mutate(notif.id);
                            const target = targetFor(notif.payload);
                            if (target) router.push(target);
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-left shadow-soft outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                            !read
                              ? "border-foreground/20 bg-surface ring-1 ring-foreground/10"
                              : "border-border/60 bg-surface/70",
                          )}
                        >
                          <span
                            className={cn(
                              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
                              !read
                                ? "bg-foreground text-background"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "line-clamp-2 text-sm font-semibold",
                                  !read ? "text-foreground" : "text-foreground/75",
                                )}
                              >
                                {notif.title}
                              </p>
                              {!read && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold ring-2 ring-surface"
                                />
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {notif.body}
                            </p>
                            <p className="mt-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground/70">
                              {format(new Date(notif.created_at), "HH:mm")}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default function NotificationsWithAuth() {
  return (
    <AuthGate
      title="Xabarnomalar uchun kiring"
      description="Booking va chat xabarlarini koʻrish uchun mijoz akkaunti kerak."
    >
      <Notifications />
    </AuthGate>
  );
}
