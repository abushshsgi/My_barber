import { useNavigate } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConversations, useCreateConversation } from "@/hooks/use-chat-api";
import { cn } from "@/lib/utils";

type Props = {
  barberId: number;
  className?: string;
};

export function BookingChatButton({ barberId, className }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: threads = [] } = useConversations();
  const createConversation = useCreateConversation();

  const openChat = async () => {
    const existing = threads.find((thread) => thread.barberId === barberId);
    if (existing) {
      void navigate({ to: "/chat/$id", params: { id: existing.id } });
      return;
    }

    try {
      const convo = await createConversation.mutateAsync(barberId);
      void navigate({ to: "/chat/$id", params: { id: convo.id } });
    } catch {
      void navigate({ to: "/chat" });
    }
  };

  return (
    <button
      type="button"
      onClick={() => void openChat()}
      disabled={createConversation.isPending}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-background py-2.5 text-xs font-bold shadow-sm disabled:opacity-60",
        className,
      )}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {createConversation.isPending ? t("common.loading") : t("bookings.chat")}
    </button>
  );
}
