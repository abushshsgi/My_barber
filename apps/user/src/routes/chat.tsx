import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { ChatDesktopInbox } from "@/components/desktop/pages/ChatDesktopPage";
import { MobileListPage } from "@/components/mobile/MobileListPage";
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
        <MobileListPage title={t("chat.title")} showBack={false}>
          <ChatThreadList hideMobileTitle />
        </MobileListPage>
      }
      desktop={<ChatDesktopInbox />}
    />
  );
}
