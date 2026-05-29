import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MessageSquare, Search, Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { chatThreads } from "@/lib/mock-data";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — mysaloon.uz" }] }),
  component: ChatList,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ChatList() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const list = useMemo(() => {
    let res = chatThreads;
    if (filter === "unread") res = res.filter((c) => c.unread > 0);
    if (q.trim()) {
      const s = q.toLowerCase();
      res = res.filter(
        (c) =>
          c.barberName.toLowerCase().includes(s) ||
          c.salonName.toLowerCase().includes(s) ||
          c.lastMessage.toLowerCase().includes(s),
      );
    }
    return res;
  }, [q, filter]);

  if (chatThreads.length === 0) {
    return (
      <>
        <PageHeader title={t("chat.title")} />
        <EmptyState icon={<MessageSquare className="h-7 w-7" />} title={t("chat.empty")} />
      </>
    );
  }

  const totalUnread = chatThreads.reduce((a, c) => a + c.unread, 0);

  return (
    <div className="pb-4">
      <PageHeader title={t("chat.title")} />

      {/* Search */}
      <div className="px-5">
        <div className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suhbatlarni izlash"
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Filter pills */}
        <div className="mt-3 flex gap-2">
          {(["all", "unread"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                filter === k ? "bg-foreground text-background" : "bg-surface text-foreground/70",
              )}
            >
              {k === "all" ? "Hammasi" : `O'qilmagan${totalUnread > 0 ? ` · ${totalUnread}` : ""}`}
            </button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      <div className="mt-4 divide-y divide-border">
        {list.map((c, i) => {
          const online = i % 2 === 0;
          return (
            <Link
              key={c.id}
              to="/chat/$id"
              params={{ id: c.id }}
              className="flex items-start gap-3 px-5 py-3.5 transition-colors active:bg-surface"
            >
              {/* Avatar with initials */}
              <div className="relative shrink-0">
                <div
                  className="grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-background"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.55 0.05 ${(c.id.charCodeAt(0) * 30) % 360}), oklch(0.25 0.02 ${(c.id.charCodeAt(0) * 30 + 60) % 360}))`,
                  }}
                >
                  {initials(c.barberName)}
                </div>
                {online && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-foreground ring-2 ring-background" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold">{c.barberName}</h3>
                    {i === 0 && <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  </div>
                  <span className={cn(
                    "shrink-0 text-[10px] font-bold uppercase tracking-wide",
                    c.unread > 0 ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {c.lastTime}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {c.salonName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className={cn(
                    "truncate flex-1 text-xs",
                    c.unread > 0 ? "font-bold text-foreground" : "text-muted-foreground",
                  )}>
                    {c.lastMessage}
                  </p>
                  {c.unread > 0 && (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 && (
          <EmptyState icon={<Search className="h-7 w-7" />} title="Hech narsa topilmadi" />
        )}
      </div>
    </div>
  );
}
