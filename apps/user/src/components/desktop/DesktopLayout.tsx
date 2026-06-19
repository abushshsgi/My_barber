import { useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { DesktopVariantProvider } from "@/components/desktop/DesktopVariantContext";
import { DesktopShell } from "@/components/desktop/shell/DesktopShell";
import { DesktopVariantPicker } from "@/components/desktop/DesktopVariantPicker";
import { SiteFooter } from "@/components/SiteFooter";
import { readDesktopVariant, saveDesktopVariant, type DesktopUiVariant } from "@/lib/desktop-variant";
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
  const [variant, setVariant] = useState<DesktopUiVariant>(() => readDesktopVariant());
  const isMap = pathname === "/map";
  const isAiStyle = pathname === "/ai-style";
  const isFullBleed =
    isAiStyle ||
    isMap ||
    FULL_BLEED_PREFIX.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const showFooter = showsSiteFooter(pathname) && !isFullBleed;
  const showPicker = !isMap && !isAiStyle;

  const onVariantChange = (next: DesktopUiVariant) => {
    setVariant(next);
    saveDesktopVariant(next);
  };

  return (
    <DesktopVariantProvider value={variant}>
      <div className="min-h-screen bg-background text-foreground">
        <DesktopShell
        variant={variant}
        chatUnread={chatUnread}
        notificationsUnread={notificationsUnread}
        fullBleed={isFullBleed}
      >
        {isFullBleed ? (
          <div
            className={cn(
              isMap && "h-[calc(100dvh-4rem)]",
              isAiStyle && "h-[calc(100dvh-4rem)] overflow-hidden",
            )}
          >
            {children}
          </div>
        ) : (
          <>
            {children}
            {showFooter ? <SiteFooter /> : null}
          </>
        )}
      </DesktopShell>
      {showPicker ? <DesktopVariantPicker value={variant} onChange={onVariantChange} /> : null}
      </div>
    </DesktopVariantProvider>
  );
}
