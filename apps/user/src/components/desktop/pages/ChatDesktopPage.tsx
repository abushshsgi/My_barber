import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatThreadList } from "@/components/chat/ChatThreadList";
import { ChatThreadView } from "@/components/chat/ChatThreadView";
import { DesktopEmptyState } from "@/components/layout/DesktopEmptyState";

type InboxProps = {
  className?: string;
};

export function ChatDesktopInbox({ className }: InboxProps) {
  const { t } = useTranslation();
  return (
    <div className={className ?? "grid h-[calc(100dvh-8rem)] grid-cols-[360px_1fr] overflow-hidden rounded-2xl border border-border"}>
      <ChatThreadList className="border-r border-border" />
      <DesktopEmptyState
        icon={<MessageSquare className="h-8 w-8" />}
        title={t("chat.selectThread", { defaultValue: "Suhbatni tanlang" })}
        description={t("chat.selectThreadHint", {
          defaultValue: "Chapdan ustaga yozing yoki mavjud suhbatni oching.",
        })}
      />
    </div>
  );
}

type ThreadProps = {
  threadId: string;
};

export function ChatDesktopThread({ threadId }: ThreadProps) {
  return (
    <div className="grid h-[calc(100dvh-8rem)] grid-cols-[360px_1fr] overflow-hidden rounded-2xl border border-border">
      <ChatThreadList activeId={threadId} className="border-r border-border" />
      <ChatThreadView threadId={threadId} embedded />
    </div>
  );
}
