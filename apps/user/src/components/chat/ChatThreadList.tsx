import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConversations } from "@/hooks/use-chat-api";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type Props = {
  activeId?: string;
  className?: string;
  hideMobileTitle?: boolean;
};

export function ChatThreadList({ activeId, className, hideMobileTitle }: Props) {
  const { t } = useTranslation();
  const { data: chatThreads = [], isLoading } = useConversations();
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
  }, [q, filter, chatThreads]);

  const totalUnread = chatThreads.reduce((a, c) => a + c.unread, 0);

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (chatThreads.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <EmptyState icon={<MessageSquare className="h-7 w-7" />} title={t("chat.empty")} />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="shrink-0 border-b border-border p-4">
        {!hideMobileTitle ? (
          <h2 className="text-lg font-bold tracking-tight lg:hidden">{t("chat.title")}</h2>
        ) : null}
        <div className={cn("flex items-center gap-2 rounded-2xl bg-surface px-4 py-3", !hideMobileTitle && "mt-3 lg:mt-0")}>
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={2.4} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("chat.searchPlaceholder", { defaultValue: "Suhbatlarni izlash" })}
            className="flex-1 bg-transparent text-sm font-medium placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <div className="mt-3 flex gap-2">
          {(["all", "unread"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors",
                filter === k ? "bg-foreground text-background" : "bg-surface text-foreground/70",
              )}
            >
              {k === "all"
                ? t("chat.filterAll", { defaultValue: "Hammasi" })
                : t("chat.filterUnread", {
                    defaultValue: "O'qilmagan",
                    count: totalUnread > 0 ? ` · ${totalUnread}` : "",
                  })}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {list.map((c) => {
          const active = activeId === c.id;
          return (
            <Link
              key={c.id}
              to="/chat/$id"
              params={{ id: c.id }}
              className={cn(
                "flex items-start gap-3 px-4 py-3.5 transition-colors active:bg-surface hover:bg-surface/50",
                active && "bg-surface",
              )}
            >
              <div className="relative shrink-0">
                {c.avatarUrl ? (
                  <img
                    src={c.avatarUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-background"
                    style={{
                      background: `linear-gradient(135deg, oklch(0.55 0.05 ${(c.id.charCodeAt(0) * 30) % 360}), oklch(0.25 0.02 ${(c.id.charCodeAt(0) * 30 + 60) % 360}))`,
                    }}
                  >
                    {initials(c.barberName)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="truncate text-sm font-bold">{c.barberName}</h3>
                  <span
                    className={cn(
                      "shrink-0 text-[10px] font-bold uppercase tracking-wide",
                      c.unread > 0 ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.lastTime}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {c.salonName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p
                    className={cn(
                      "flex-1 truncate text-xs",
                      c.unread > 0 ? "font-bold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.lastMessage || t("chat.noMessagesYet", { defaultValue: "Xabar yo'q" })}
                  </p>
                  {c.unread > 0 ? (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">
                      {c.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
        {list.length === 0 ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title={t("chat.searchEmpty", { defaultValue: "Hech narsa topilmadi" })}
          />
        ) : null}
      </div>
    </div>
  );
}
