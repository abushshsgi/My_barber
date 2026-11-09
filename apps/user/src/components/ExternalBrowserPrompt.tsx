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
  openExternalBrowser,
  resolveExternalPageTarget,
  tryBuildAndroidChromeIntent,
} from "@/lib/external-browser";

const CHROME_LAUNCH_WAIT_MS = 1600;

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
  const [chromeFailed, setChromeFailed] = useState(false);
  const [safariStepsArmed, setSafariStepsArmed] = useState(false);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const failTimer = useRef<number | null>(null);
  const chromeWatchCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    const open = () => setForced(true);
    window.addEventListener(EXTERNAL_BROWSER_PROMPT_EVENT, open);
    return () => {
      window.removeEventListener(EXTERNAL_BROWSER_PROMPT_EVENT, open);
      if (failTimer.current !== null) window.clearTimeout(failTimer.current);
      chromeWatchCleanup.current?.();
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
  const intentUrl = detection.os === "android" ? tryBuildAndroidChromeIntent(pageUrl) : null;

  const dismiss = () => {
    dismissExternalBrowserPrompt(sessionStorage);
    setDismissed(true);
    setForced(false);
  };

  const copy = async () => {
    const ok = await copyPageUrl(pageUrl);
    if (ok) toast.success(t("inAppBrowser.copied"));
    else toast.error(t("inAppBrowser.copyFailed"));
    return ok;
  };

  const armChromeWatch = () => {
    chromeWatchCleanup.current?.();
    setChromeFailed(false);
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
    chromeWatchCleanup.current = cleanup;
    if (failTimer.current !== null) window.clearTimeout(failTimer.current);
    failTimer.current = window.setTimeout(() => {
      cleanup();
      chromeWatchCleanup.current = null;
      if (!leftPage && document.visibilityState === "visible") setChromeFailed(true);
    }, CHROME_LAUNCH_WAIT_MS);
  };

  const openSafariSteps = () => {
    const result = openExternalBrowser("ios", pageUrl);
    if (result.status !== "instructions") return;
    setSafariStepsArmed(true);
    void copyPageUrl(pageUrl).then((ok) => {
      if (ok) toast.success(t("inAppBrowser.copiedSafari"));
      else toast.error(t("inAppBrowser.copyFailed"));
    });
    instructionsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const secondStep =
    detection.os === "ios"
      ? t("inAppBrowser.stepIos")
      : detection.os === "android"
        ? t("inAppBrowser.stepAndroid")
        : t("inAppBrowser.stepOther");

  return (
    <Dialog open onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="z-[80] gap-5 rounded-[1.65rem] border-foreground/10 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.45)] sm:p-6">
        <DialogHeader className="space-y-2 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            MySaloon
          </p>
          <DialogTitle className="font-display text-[1.65rem] font-bold leading-[1.1] tracking-tight">
            {t("inAppBrowser.title")}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed">
            {t("inAppBrowser.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          {detection.os === "android" && intentUrl ? (
            <Button asChild className="h-12 w-full rounded-2xl text-sm font-bold">
              <a href={intentUrl} rel="noopener" onClick={armChromeWatch}>
                <ExternalLink />
                {t("inAppBrowser.openChrome")}
              </a>
            </Button>
          ) : null}
          {detection.os === "android" && !intentUrl ? (
            <Button
              type="button"
              className="h-12 w-full rounded-2xl text-sm font-bold"
              onClick={() => setChromeFailed(true)}
            >
              <ExternalLink />
              {t("inAppBrowser.openChrome")}
            </Button>
          ) : null}
          {detection.os === "ios" ? (
            <Button
              type="button"
              className="h-12 w-full rounded-2xl text-sm font-bold"
              onClick={openSafariSteps}
            >
              <ExternalLink />
              {t("inAppBrowser.openSafari")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl text-sm font-bold"
            onClick={() => void copy()}
          >
            <Copy />
            {t("inAppBrowser.copyLink")}
          </Button>
        </div>

        {chromeFailed ? (
          <p className="rounded-2xl bg-destructive/10 px-3.5 py-3 text-sm font-medium leading-relaxed text-destructive">
            {t("inAppBrowser.chromeFailed")}
          </p>
        ) : null}

        <div
          ref={instructionsRef}
          className={
            safariStepsArmed
              ? "rounded-2xl border border-foreground/20 bg-muted/50 px-3.5 py-3 ring-2 ring-foreground/15"
              : "rounded-2xl border border-border bg-muted/40 px-3.5 py-3"
          }
        >
          <ol className="list-decimal space-y-1.5 pl-4 text-left text-[13px] leading-relaxed text-muted-foreground">
            <li>{t("inAppBrowser.stepMenu")}</li>
            <li>{secondStep}</li>
          </ol>
        </div>

        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("inAppBrowser.urlLabel")}
          </span>
          <input
            readOnly
            value={pageUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium break-all text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>

        <button
          type="button"
          onClick={dismiss}
          className="w-full cursor-pointer rounded-2xl py-2 text-center text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("inAppBrowser.continue")}
        </button>
      </DialogContent>
    </Dialog>
  );
}
