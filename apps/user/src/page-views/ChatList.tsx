"use client";

import { Link } from "@/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Loader2, ChevronRight } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { apiList } from "@/lib/api";
import { AuthGate } from "@/components/AuthGate";
import { initials } from "@/lib/format";
import { useUserPreferences } from "@/hooks/useUserPreferences";

type ConversationRow = {
  id: string;
  last_message_text: string;
  last_message_at: string | null;
  updated_at: string;
  other: { kind: "BARBER" | "USER"; id: number; full_name: string };
};

async function fetchConversations(): Promise<ConversationRow[]> {
  return apiList<ConversationRow>("/api/v1/chat/conversations/");
}

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Kecha";
  return format(d, "d MMM");
}

function ChatList() {
  const { chatAlerts } = useUserPreferences();
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: fetchConversations,
    staleTime: 10_000,
    refetchInterval: chatAlerts ? 30_000 : false,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="px-5 pt-safe">
        <div className="pt-3">
          <p className="label-eyebrow">Suhbatlar</p>
          <h1 className="font-display text-[26px] font-semibold tracking-tight text-foreground">
            Chat
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bron qilingandan keyin barber bilan bogʻlaning
          </p>
        </div>
      </header>

      <div className="space-y-2 px-5 pb-6 pt-5">
        {!chatAlerts ? (
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Chat eslatmalari o‘chirilgan</p>
            <p className="mt-1 leading-relaxed">
              Yangi xabarlar notificationlar sahifasida ko‘rsatilmaydi. Chat yozishmalarini ko‘rish mumkin.
            </p>
            <Link
              to="/settings"
              className="mt-2 inline-flex text-sm font-semibold text-accent underline-offset-2 hover:underline"
            >
              Sozlamalar
            </Link>
          </div>
        ) : null}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <p className="py-12 text-center text-sm text-muted-foreground">Chatlar yuklanmadi</p>
        )}

        {!isLoading &&
          !error &&
          data.map((c) => (
            <Link
              key={c.id}
              to="/chat/$id"
              params={{ id: c.id }}
              className="group flex cursor-pointer items-center gap-3 rounded-3xl border border-border bg-surface p-3.5 shadow-soft outline-none transition hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-foreground text-[12px] font-bold text-background ring-2 ring-gold/30">
                {initials(c.other.full_name) || "MB"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-bold text-foreground">
                    {c.other.full_name}
                  </p>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {timeLabel(c.last_message_at)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {c.last_message_text || "Hozircha xabar yoʻq"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:translate-x-0.5" />
            </Link>
          ))}

        {!isLoading && !error && data.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface py-16 text-center shadow-soft">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              <MessageCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">Hozircha chat yoʻq</p>
            <p className="mx-auto mt-1 max-w-[24ch] text-sm text-muted-foreground">
              Avval sartaroshda bron qiling — shundan keyin chat ochiladi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatListWithAuth() {
  return (
    <AuthGate
      title="Chat uchun kiring"
      description="Sartarosh bilan yozishish uchun mijoz akkaunti kerak."
    >
      <ChatList />
    </AuthGate>
  );
}
