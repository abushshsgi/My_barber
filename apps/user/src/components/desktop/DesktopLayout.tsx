import { useRouterState } from "@tanstack/react-router";
import { DesktopShell } from "@/components/desktop/shell/DesktopShell";
import { SiteFooter } from "@/components/SiteFooter";
import { DESKTOP_BAZAAR_INSET, DESKTOP_SHELL_INSET, usesDesktopBazaarInset } from "@/lib/desktop-bazaar-layout";
import { showsSiteFooter } from "@/lib/layout-routes";
import { cn } from "@/lib/utils";

const FULL_BLEED_PREFIX = ["/map", "/stories/"];

type Props = {
  children: React.ReactNode;
  chatUnread?: number;
  notificationsUnread?: number;
};

export function DesktopLayout({ children, chatUnread = 0, notificationsUnread = 0 }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMap = pathname === "/map";
  const bazaarInset = usesDesktopBazaarInset(pathname);
  const isAiStyle = pathname === "/ai-style";
  const isFullBleed =
    isAiStyle ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const showFooter = showsSiteFooter(pathname) && !isFullBleed;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesktopShell
        chatUnread={chatUnread}
        notificationsUnread={notificationsUnread}
        fullBleed={isFullBleed}
        mainClassName={bazaarInset ? "w-full px-0" : undefined}
        headerInsetClassName={DESKTOP_SHELL_INSET}
      >
        {isFullBleed ? (
          <div
            className={cn(
              (isMap || isAiStyle) &&
                "flex min-h-0 flex-col overflow-hidden h-[calc(100dvh-4.25rem)]",
            )}
          >
            {children}
          </div>
        ) : (
          <>
            {children}
            {showFooter ? <SiteFooter insetClassName={bazaarInset ? DESKTOP_BAZAAR_INSET : undefined} /> : null}
          </>
        )}
      </DesktopShell>
    </div>
  );
}
