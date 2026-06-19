import type { DesktopUiVariant } from "@/lib/desktop-variant";
import { ShellDashboard, ShellEditorial, ShellMarketplace } from "./DesktopShellParts";

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
    case "dashboard":
      return <ShellDashboard {...shared} />;
    case "editorial":
      return <ShellEditorial {...shared} />;
    case "marketplace":
    default:
      return <ShellMarketplace {...shared} />;
  }
}
