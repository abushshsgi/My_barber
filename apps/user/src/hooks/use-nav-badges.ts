import { useConversations } from "@/hooks/use-chat-api";
import { useNotificationsApi } from "@/hooks/use-notifications-api";

export function useNavBadges() {
  const { data: chatThreads = [] } = useConversations();
  const { data: notifications = [] } = useNotificationsApi();

  const chatUnread = chatThreads.reduce((sum, thread) => sum + thread.unread, 0);
  const notificationsUnread = notifications.filter((item) => !item.read).length;

  return { chatUnread, notificationsUnread };
}
