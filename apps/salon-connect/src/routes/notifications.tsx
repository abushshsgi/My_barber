import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, CalendarCheck, MessageSquare, Star, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { notifications as initial, type Notification } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Bildirishnomalar — mysaloon.uz" }] }),
  component: Notifications,
});

const TYPE_ICON: Record<Notification["type"], typeof Bell> = {
  booking: CalendarCheck,
  chat_message: MessageSquare,
  review: Star,
  promo: Tag,
};

function Notifications() {
  const { t } = useTranslation();
  const [items, setItems] = useState(initial);

  const markAll = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  const markOne = (id: string) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  return (
    <div>
      <PageHeader
        title={t("notifications.title")}
        right={
          <button
            onClick={markAll}
            className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            {t("notifications.markAll")}
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={<Bell className="h-7 w-7" />} title={t("notifications.empty")} />
      ) : (
        <div className="divide-y divide-border">
          {items.map((n) => {
            const Icon = TYPE_ICON[n.type];
            const content = (
              <div
                onClick={() => markOne(n.id)}
                className={cn(
                  "flex gap-3 px-5 py-4 transition-colors active:bg-surface",
                  !n.read && "bg-surface/40",
                )}
              >
                <div className="relative">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-surface">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </div>
                  {!n.read && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-foreground ring-2 ring-background" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate text-sm font-bold">{n.title}</h3>
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                      {n.time}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
