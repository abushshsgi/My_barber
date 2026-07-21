import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchTickets } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support")({ component: SupportPage });

const TABS = [
  { key: "all", label: "Hammasi" },
  { key: "open", label: "Ochiq" },
  { key: "pending", label: "Kutilmoqda" },
  { key: "resolved", label: "Hal qilindi" },
  { key: "closed", label: "Yopilgan" },
] as const;

const PRIO_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-info/15 text-info",
  high: "bg-warning/15 text-[oklch(0.45_0.14_75)]",
  urgent: "bg-destructive/15 text-destructive",
};

function SupportPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const q = useQuery({
    queryKey: ["admin", "tickets", { tab }],
    queryFn: () => fetchTickets({ status: tab }),
  });
  const data = q.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Murojaatlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Foydalanuvchilardan kelgan support so'rovlari.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 overflow-x-auto max-w-full">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState title="Murojaatlar topilmadi" description="Bu filterda murojaat yo'q." />
        ) : (
          <div className="divide-y divide-border">
            {data.map((t) => (
              <Link
                key={t.id}
                to="/admin/support/$ticketId"
                params={{ ticketId: t.id }}
                className="flex items-center gap-4 px-6 py-4 hover:bg-background/50 transition-colors"
              >
                <img
                  src={t.user_avatar}
                  className="size-10 rounded-full object-cover ring-1 ring-border"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">{t.subject}</span>
                    {t.unread > 0 && <span className="size-2 rounded-full bg-destructive" />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {t.user_name} · {t.assignee ?? "Biriktirilmagan"}
                    {t.related_type === "gift_transfer" ? " · Sovg'a dispute" : ""}
                  </div>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-xs font-medium",
                    PRIO_COLORS[t.priority],
                  )}
                >
                  {t.priority}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums hidden sm:block">
                  {format(new Date(t.updated_at), "dd MMM HH:mm")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
