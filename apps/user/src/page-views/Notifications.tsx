"use client";

import {
  Bell,
  CheckCircle,
  Clock,
  Star,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { fetchNotifications } from "@/lib/notifications-queries";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, typeof Clock> = {
  reminder_1h: Clock,
  booking_accepted: CheckCircle,
  booking_done: Star,
  salon_invite: Bell,
  barber_approved: Bell,
  new_booking: Bell,
};

const Notifications = () => {
  const qc = useQueryClient();

  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
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
      if (!res.ok) throw new Error("Hammasini o'qish belgilanmadi");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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

  return (
    <div className="min-h-screen bg-background">
      <div className="px-5 pt-12 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-extrabold text-foreground tracking-tight"
            >
              Xabarnomalar
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-sm text-muted-foreground mt-0.5"
            >
              {unreadCount > 0 ? `${unreadCount} ta yangi xabar` : "Hammasi o‘qilgan"}
            </motion.p>
          </div>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center"
            >
              <span className="text-xs font-bold text-accent-foreground">{unreadCount}</span>
            </motion.div>
          )}
        </div>
      </div>

      {unreadCount > 0 ? (
        <div className="px-5 pt-1">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-xl"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {markAllRead.isPending ? "Belgilanmoqda..." : "Hammasini o‘qilgan qilish"}
          </Button>
        </div>
      ) : null}

      <div className="px-5 py-4 space-y-2.5">
        <AnimatePresence>
          {notifications.map((notif, i) => {
            const Icon = iconMap[notif.type] ?? Bell;
            const read = !!notif.read_at;

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, height: 0 }}
                transition={{ delay: i * 0.04 }}
                layout
                className={cn(
                  "w-full text-left flex flex-col gap-3 p-4 rounded-2xl transition-colors border",
                  !read
                    ? "bg-accent/[0.06] border-accent/15"
                    : "bg-card border-border/40"
                )}
              >
                <button
                  type="button"
                  className="flex gap-3.5 w-full text-left"
                  onClick={() => {
                    if (!read) markRead.mutate(notif.id);
                  }}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      notif.type === "reminder_1h"
                        ? "bg-warning/15 text-warning"
                        : "bg-accent/15 text-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "font-semibold text-sm",
                          !read ? "text-foreground" : "text-foreground/80"
                        )}
                      >
                        {notif.title}
                      </p>
                      {!read && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{notif.body}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2 font-medium">
                      {format(new Date(notif.created_at), "d MMM, HH:mm")}
                    </p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {notifications.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <Bell className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Xabarlar yo&apos;q</p>
            <p className="text-sm text-muted-foreground">Yangi xabarlar shu yerda chiqadi</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
