import type { DesktopUiVariant } from "@/lib/desktop-variant";
import {
  ShellAtelier,
  ShellBazaar,
  ShellHub,
  ShellReserve,
  ShellVoyage,
} from "./DesktopShellParts";

type Props = {
  variant: DesktopUiVariant;
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
  fullBleed?: boolean;
};

export function DesktopShell({ variant, children, chatUnread, notificationsUnread, fullBleed }: Props) {
  const shared = { chatUnread, notificationsUnread, fullBleed, children };

  switch (variant) {
    case "reserve":
      return <ShellReserve {...shared} />;
    case "atelier":
      return <ShellAtelier {...shared} />;
    case "hub":
      return <ShellHub {...shared} />;
    case "bazaar":
      return <ShellBazaar {...shared} />;
    case "voyage":
    default:
      return <ShellVoyage {...shared} />;
  }
}
