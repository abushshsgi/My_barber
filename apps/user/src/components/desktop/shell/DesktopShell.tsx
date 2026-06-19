import { ShellBazaarClassic } from "./DesktopShellParts";

type Props = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
};

export function DesktopShell({ children, chatUnread, notificationsUnread, fullBleed }: Props) {
  return (
    <ShellBazaarClassic chatUnread={chatUnread} notificationsUnread={notificationsUnread} fullBleed={fullBleed}>
      {children}
    </ShellBazaarClassic>
  );
}
