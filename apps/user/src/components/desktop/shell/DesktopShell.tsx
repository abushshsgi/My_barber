import { ShellBazaarClassic } from "./DesktopShellParts";

type Props = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
  mainClassName?: string;
  headerInsetClassName?: string;
};

export function DesktopShell({
  children,
  chatUnread,
  notificationsUnread,
  fullBleed,
  mainClassName,
  headerInsetClassName,
}: Props) {
  return (
    <ShellBazaarClassic
      chatUnread={chatUnread}
      notificationsUnread={notificationsUnread}
      fullBleed={fullBleed}
      mainClassName={mainClassName}
      headerInsetClassName={headerInsetClassName}
    >
      {children}
    </ShellBazaarClassic>
  );
}
