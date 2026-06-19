import type { DesktopUiVariant } from "@/lib/desktop-variant";
import {
  ShellBazaarAtlas,
  ShellBazaarClassic,
  ShellBazaarHorizon,
  ShellBazaarLuxe,
  ShellBazaarSpread,
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
    case "spread":
      return <ShellBazaarSpread {...shared} />;
    case "horizon":
      return <ShellBazaarHorizon {...shared} />;
    case "atlas":
      return <ShellBazaarAtlas {...shared} />;
    case "luxe":
      return <ShellBazaarLuxe {...shared} />;
    case "classic":
    default:
      return <ShellBazaarClassic {...shared} />;
  }
}
