import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead, useNotifications } from "@/lib/notification-queries";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function relTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.round(hrs / 24);
  return `${days} days ago`;
}

function NotificationsPage() {
  const q = useNotifications();
  const markRead = useMarkNotificationRead();
  const rows = q.data ?? [];

  return (
    <>
      <Topbar title="Notifications" />
      <div className="p-6">
        <div className="space-y-1">
          {rows.map((n) => {
            const read = !!n.read_at;
            return (
            <div
              key={n.id}
              onClick={() => {
                if (!read) markRead.mutate(n.id);
              }}
              className={cn(
                "flex items-start gap-4 rounded-xl border border-transparent px-4 py-3 transition-colors",
                !read && "border-border bg-muted/50"
              )}
            >
              <div className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                read ? "bg-transparent" : "bg-foreground"
              )} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{n.body}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{relTime(n.created_at)}</span>
            </div>
          )})}
        </div>
      </div>
    </>
  );
}
