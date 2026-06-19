import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopEmptyState } from "@/components/layout/DesktopEmptyState";
import { ChatThreadList } from "@/components/chat/ChatThreadList";
import { cn } from "@/lib/utils";

type Props = {
  activeId?: string;
  children: React.ReactNode;
  className?: string;
};

export function ChatDesktopLayout({ activeId, children, className }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <div
        className={cn(
          "hidden lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[360px_1fr] lg:overflow-hidden lg:border-t lg:border-border",
          className,
        )}
      >
        <ChatThreadList activeId={activeId} className="border-r border-border" />
        <div className="flex min-h-0 min-w-0 flex-col bg-background">
          {children ?? (
            <DesktopEmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title={t("chat.selectThread", { defaultValue: "Suhbatni tanlang" })}
              description={t("chat.selectThreadHint", {
                defaultValue: "Chapdan ustaga yozing yoki mavjud suhbatni oching.",
              })}
            />
          )}
        </div>
      </div>
      <div className="lg:hidden">{children}</div>
    </>
  );
}
