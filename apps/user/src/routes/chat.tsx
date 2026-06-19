import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { ChatThreadList } from "@/components/chat/ChatThreadList";
import { DesktopEmptyState } from "@/components/layout/DesktopEmptyState";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — mysaloon.uz" }] }),
  component: ChatList,
});

function ChatList() {
  const { t } = useTranslation();

  return (
    <>
      <div className="hidden lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[360px_1fr] lg:overflow-hidden lg:border-t lg:border-border">
        <ChatThreadList className="border-r border-border" />
        <DesktopEmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title={t("chat.selectThread", { defaultValue: "Suhbatni tanlang" })}
          description={t("chat.selectThreadHint", {
            defaultValue: "Chapdan ustaga yozing yoki mavjud suhbatni oching.",
          })}
        />
      </div>

      <div className="lg:hidden">
        <PageHeader title={t("chat.title")} />
        <ChatThreadList hideMobileTitle />
      </div>
    </>
  );
}
