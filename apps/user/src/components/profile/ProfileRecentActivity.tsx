import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  ChevronRight,
  MessageSquare,
  Star,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { notifications, type Notification } from "@/lib/mock-data";
import { getNotificationLinkProps } from "@/lib/notification-links";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<Notification["type"], LucideIcon> = {
  booking: CalendarCheck,
  chat_message: MessageSquare,
  review: Star,
  promo: Tag,
};

export function ProfileRecentActivity() {
  const { t } = useTranslation();
  const recent = notifications.slice(0, 3);

  return (
    <section className="mt-6 px-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("profile.variant4.recentActivity")}
        </h2>
        <Link
          to="/notifications"
          className="flex items-center gap-0.5 text-[11px] font-bold text-foreground"
        >
          {t("profile.variant4.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border">
        {recent.map((n, i) => {
          const Icon = TYPE_ICON[n.type];
          const target = getNotificationLinkProps(n);
          const hasLink = Boolean(n.bookingId || n.chatId || n.reviewId || n.link);
          const row = (
            <div
              className={cn(
                "flex items-center gap-3 px-4 py-3.5",
                !n.read && "bg-surface/40",
                i < recent.length - 1 && "border-b border-border",
              )}
            >
              <div className="relative shrink-0">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-surface">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
                {!n.read && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-foreground ring-2 ring-background" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{n.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{n.body}</p>
              </div>
              <span className="shrink-0 text-[10px] font-bold text-muted-foreground">{n.time}</span>
            </div>
          );

          if (!hasLink) {
            return <div key={n.id}>{row}</div>;
          }

          return (
            <Link
              key={n.id}
              to={target.to as never}
              params={target.params as never}
              search={target.search as never}
              className="block active:bg-surface"
            >
              {row}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
