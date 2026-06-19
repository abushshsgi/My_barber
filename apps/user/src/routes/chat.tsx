import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ChatDesktopInbox } from "@/components/desktop/pages/ChatDesktopPage";
import { PageHeader } from "@/components/PageHeader";
import { ChatThreadList } from "@/components/chat/ChatThreadList";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — mysaloon.uz" }] }),
  component: ChatList,
});

function ChatList() {
  const { t } = useTranslation();

  return (
    <DesktopPageSplit
      mobile={
        <>
          <PageHeader title={t("chat.title")} />
          <ChatThreadList hideMobileTitle />
        </>
      }
      desktop={<ChatDesktopInbox />}
    />
  );
}
