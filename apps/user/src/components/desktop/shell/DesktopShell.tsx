import { ShellBazaarClassic } from "./DesktopShellParts";

type Props = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
  mainClassName?: string;
};

export function DesktopShell({ children, chatUnread, notificationsUnread, fullBleed, mainClassName }: Props) {
  return (
    <ShellBazaarClassic
      chatUnread={chatUnread}
      notificationsUnread={notificationsUnread}
      fullBleed={fullBleed}
      mainClassName={mainClassName}
    >
      {children}
    </ShellBazaarClassic>
  );
}
