"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Loader2 } from "lucide-react";
import { apiJson } from "@/lib/api";
import { Card } from "@/components/ui/card";

type ConversationRow = {
  id: string;
  last_message_text: string;
  last_message_at: string | null;
  updated_at: string;
  other: { kind: "BARBER" | "USER"; id: number; full_name: string };
};

async function fetchConversations(): Promise<ConversationRow[]> {
  return apiJson<ConversationRow[]>("/api/v1/chat/conversations/");
}

export default function ChatList() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["chat", "conversations"],
    queryFn: fetchConversations,
    staleTime: 10_000,
  });

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-xl font-bold">Chat</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Barber bilan faqat yozishmalar (voice/image yo&apos;q).
        </p>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}

        {!isLoading && error && (
          <p className="text-center text-muted-foreground py-12">
            Chatlar yuklanmadi
          </p>
        )}

        {!isLoading &&
          !error &&
          data.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`}>
              <Card className="p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.other.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {c.last_message_text || "Hozircha xabar yo‘q"}
                  </p>
                </div>
              </Card>
            </Link>
          ))}

        {!isLoading && !error && data.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Hozircha chat yo&apos;q
          </p>
        )}
      </div>
    </div>
  );
}

