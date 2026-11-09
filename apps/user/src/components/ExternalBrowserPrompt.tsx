import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInAppBrowserDetection } from "@/hooks/useInAppBrowserDetection";
import { hasValidUserSession } from "@/lib/api/client";
import {
  copyPageUrl,
  dismissExternalBrowserPrompt,
  EXTERNAL_BROWSER_PROMPT_EVENT,
  isExternalBrowserPromptDismissed,
  resolveExternalPageTarget,
  tryBuildAndroidChromeIntent,
  tryBuildIosExternalUrl,
} from "@/lib/external-browser";

const HANDOFF_WAIT_MS = 1600;

export function ExternalBrowserPrompt() {
  const { t } = useTranslation();
  const detection = useInAppBrowserDetection();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [dismissed, setDismissed] = useState(() =>
    isExternalBrowserPromptDismissed(typeof sessionStorage === "undefined" ? null : sessionStorage),
  );
  const [forced, setForced] = useState(false);
  const [failedBrowser, setFailedBrowser] = useState<"safari" | "chrome" | null>(null);
  const failTimer = useRef<number | null>(null);
  const watchCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    const open = () => setForced(true);
    window.addEventListener(EXTERNAL_BROWSER_PROMPT_EVENT, open);
    return () => {
      window.removeEventListener(EXTERNAL_BROWSER_PROMPT_EVENT, open);
      if (failTimer.current !== null) window.clearTimeout(failTimer.current);
      watchCleanup.current?.();
    };
  }, []);

  const loggedIn = hasValidUserSession();
  if (!detection.isInAppBrowser || (!forced && (dismissed || loggedIn))) return null;

  const pageUrl = resolveExternalPageTarget({
    origin: window.location.origin,
    pathname,
    search: searchStr,
    hash,
  });
  const safariUrl = detection.os === "ios" ? tryBuildIosExternalUrl(pageUrl, "safari") : null;
  const chromeUrl =
    detection.os === "ios"
      ? tryBuildIosExternalUrl(pageUrl, "chrome")
      : detection.os === "android"
        ? tryBuildAndroidChromeIntent(pageUrl)
        : null;

  const dismiss = () => {
    dismissExternalBrowserPrompt(sessionStorage);
    setDismissed(true);
    setForced(false);
  };

  const copy = async () => {
    const ok = await copyPageUrl(pageUrl);
    if (ok) toast.success(t("inAppBrowser.copied"));
    else toast.error(t("inAppBrowser.copyFailed"));
  };

  const armWatch = (browser: "safari" | "chrome") => {
    watchCleanup.current?.();
    setFailedBrowser(null);
    let leftPage = false;
    const markLeft = () => {
      leftPage = true;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") markLeft();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", markLeft);
    const cleanup = () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", markLeft);
    };
    watchCleanup.current = cleanup;
    if (failTimer.current !== null) window.clearTimeout(failTimer.current);
    failTimer.current = window.setTimeout(() => {
      cleanup();
      watchCleanup.current = null;
      if (!leftPage && document.visibilityState === "visible") setFailedBrowser(browser);
    }, HANDOFF_WAIT_MS);
  };

  const buttonClass = "h-9 flex-1 rounded-xl px-2 text-[13px] font-semibold [&_svg]:size-3.5";

  return (
    <Dialog open onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="ig-card-drop z-[80] w-[min(18.5rem,calc(100vw-2rem))] gap-2.5 rounded-2xl border-foreground/10 p-3.5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.5)] sm:p-4">
        <DialogHeader className="space-y-1 pr-6 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            MySaloon
          </p>
          <DialogTitle className="text-base font-bold leading-tight tracking-tight">
            {t("inAppBrowser.title")}
          </DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            {t("inAppBrowser.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5">
          {safariUrl ? (
            <Button asChild size="sm" className={buttonClass}>
              <a href={safariUrl} onClick={() => armWatch("safari")}>
                <ExternalLink />
                {t("inAppBrowser.openSafari")}
              </a>
            </Button>
          ) : null}
          {chromeUrl ? (
            <Button
              asChild
              size="sm"
              variant={safariUrl ? "outline" : "default"}
              className={buttonClass}
            >
              <a href={chromeUrl} onClick={() => armWatch("chrome")}>
                <ExternalLink />
                {t("inAppBrowser.openChrome")}
              </a>
            </Button>
          ) : null}
          {detection.os === "android" && !chromeUrl ? (
            <Button
              type="button"
              size="sm"
              className={buttonClass}
              onClick={() => setFailedBrowser("chrome")}
            >
              <ExternalLink />
              {t("inAppBrowser.openChrome")}
            </Button>
          ) : null}
        </div>

        {failedBrowser ? (
          <p className="text-xs font-medium leading-snug text-destructive">
            {failedBrowser === "safari"
              ? t("inAppBrowser.safariFailed")
              : t("inAppBrowser.chromeFailed")}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy className="size-3" />
            {t("inAppBrowser.copyLink")}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="cursor-pointer text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("inAppBrowser.continue")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
