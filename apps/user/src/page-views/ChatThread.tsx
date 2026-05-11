"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "@/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { apiJson, apiFetch, formatApiError, getAccessToken } from "@/lib/api";
import { chatWebSocketUrl } from "@/lib/ws-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <div className="min-h-[100dvh] flex flex-col">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl"
          onClick={() => router.back()}
          aria-label="Orqaga"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">Chat</h1>
          <p className="text-[11px] text-muted-foreground truncate">
            Faqat yozish (voice/image yo&apos;q)
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          </div>
        )}
        {!isLoading && error && (
          <p className="text-center text-muted-foreground py-10 px-4 leading-relaxed">
            Xabarlar yuklanmadi. Chat faqat bekor qilinmagan booking mavjud bo‘lsa ochiladi.
          </p>
        )}

        {!isLoading &&
          !error &&
          allMessages.map((m) => {
            const mine = m.sender_kind === "USER";
            return (
              <div
                key={m.id}
                className={cn("mb-2 flex", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md",
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })}
        <div ref={endRef} />
      </ScrollArea>

      <form
        className="sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] sm:bottom-[calc(4rem+env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-xl border-t px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          sendMutation.mutate({ text: v });
        }}
      >
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Xabar yozing…"
            maxLength={4000}
            disabled={sendMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
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
    <AuthGate title="Chat uchun kiring" description="Xabarlarni ko‘rish va yuborish uchun mijoz akkaunti kerak.">
      <ChatThread />
    </AuthGate>
  );
}

