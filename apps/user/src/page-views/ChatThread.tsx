"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "@/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { apiJson, apiFetch, formatApiError, getAccessToken } from "@/lib/api";
import { chatWebSocketUrl } from "@/lib/ws-url";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthGate } from "@/components/AuthGate";

type MessageRow = {
  id: number;
  sender_kind: "USER" | "BARBER";
  text: string;
  created_at: string;
};

type MessagesApi = {
  count: number;
  next: string | null;
  previous: string | null;
  results: MessageRow[];
};

async function fetchMessages(conversationId: string): Promise<MessagesApi> {
  return apiJson<MessagesApi>(`/api/v1/chat/conversations/${conversationId}/messages/`);
}

function ChatThread() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [live, setLive] = useState<MessageRow[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["chat", "messages", id],
    queryFn: () => fetchMessages(id),
    enabled: !!id,
  });

  const allMessages = useMemo(() => {
    const base = data?.results ?? [];
    const byId = new Map<number, MessageRow>();
    for (const m of base) byId.set(m.id, m);
    for (const m of live) byId.set(m.id, m);
    return Array.from(byId.values()).sort((a, b) => a.id - b.id);
  }, [data?.results, live]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
  }, [allMessages.length]);

  useEffect(() => {
    const token = getAccessToken();
    if (!id || !token) return;
    const ws = new WebSocket(chatWebSocketUrl(id, token));
    ws.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data) as { type?: string; message?: MessageRow };
        if (payload.type === "message" && payload.message) {
          setLive((prev) => [...prev, payload.message!]);
          qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
        }
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [id, qc]);

  const sendMutation = useMutation({
    mutationFn: async (body: { text: string }) => {
      const res = await apiFetch(`/api/v1/chat/conversations/${id}/messages/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(formatApiError(payload, "Xabar yuborilmadi"));
      return payload as MessageRow;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", "messages", id] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
    },
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-surface/95 px-3 py-2 backdrop-blur pt-safe">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => router.back()}
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="label-eyebrow truncate">Suhbat</p>
          <h1 className="truncate font-display text-lg font-semibold text-foreground">Chat</h1>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && error && (
          <p className="px-4 py-12 text-center text-sm leading-relaxed text-muted-foreground">
            Xabarlar yuklanmadi. Chat faqat bekor qilinmagan booking mavjud boʻlsa ochiladi.
          </p>
        )}

        {!isLoading &&
          !error &&
          allMessages.map((m, idx) => {
            const mine = m.sender_kind === "USER";
            const created = new Date(m.created_at);
            const prev = allMessages[idx - 1];
            const showSeparator =
              !prev || !isSameDay(new Date(prev.created_at), created);
            return (
              <div key={m.id}>
                {showSeparator && (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {format(created, "d MMM yyyy")}
                    </span>
                  </div>
                )}
                <div className={cn("mb-2 flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-3xl px-3.5 py-2 text-sm leading-relaxed shadow-soft",
                      mine
                        ? "rounded-br-md bg-foreground text-background"
                        : "rounded-bl-md border border-border bg-surface text-foreground",
                    )}
                  >
                    <p className="text-pretty">{m.text}</p>
                    <p
                      className={cn(
                        "mt-0.5 text-right text-[10px] tabular-nums",
                        mine ? "text-background/55" : "text-muted-foreground",
                      )}
                    >
                      {format(created, "HH:mm")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        className="sticky z-40 border-t border-border bg-surface/95 px-3 py-2 backdrop-blur"
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))" }}
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          sendMutation.mutate({ text: v });
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Xabar yozing…"
            maxLength={4000}
            rows={1}
            disabled={sendMutation.isPending}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-3xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const v = text.trim();
                if (v) sendMutation.mutate({ text: v });
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90"
            disabled={sendMutation.isPending || !text.trim()}
            aria-label="Yuborish"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {sendMutation.isError && (
          <p className="mt-2 px-1 text-xs text-destructive">
            {(sendMutation.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}

export default function ChatThreadWithAuth() {
  return (
    <AuthGate
      title="Chat uchun kiring"
      description="Xabarlarni koʻrish va yuborish uchun mijoz akkaunti kerak."
    >
      <ChatThread />
    </AuthGate>
  );
}
