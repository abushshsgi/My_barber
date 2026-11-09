import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { hasValidUserSession } from "@/lib/api/client";
import { trackEvent } from "@/lib/ga";
import {
  dismissFirstVisitForThisLoad,
  publishFirstVisitVisibility,
  readBrowserStorage,
  shouldShowFirstVisitFromBrowser,
  writeFirstVisitStatus,
  type FirstVisitStatus,
  type MainSlideIndex,
} from "@/lib/first-visit-onboarding";
import { requestExternalBrowserPrompt } from "@/lib/external-browser";
import { trackSiteEvent } from "@/lib/site-telemetry";

let viewTracked = false;

function sessionExists(): boolean {
  try {
    return hasValidUserSession();
  } catch {
    return false;
  }
}

function trackOnboarding(name: string, detail = "") {
  trackEvent(name, detail ? { detail } : undefined);
  const label = detail ? `${name}:${detail}` : name;
  const path = typeof window === "undefined" ? "/" : window.location.pathname;
  trackSiteEvent(name === "onboarding_view" ? "page" : "click", path, label);
}

function isAppHome(path: string) {
  return path === "/" || path === "/ai-style" || path.startsWith("/ai-style/");
}

export function useOnboarding() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => shouldShowFirstVisitFromBrowser(sessionExists()));
  const [activeMainSlide, setActiveMainSlide] = useState<MainSlideIndex>(0);

  useEffect(() => {
    if (!open || viewTracked) return;
    viewTracked = true;
    trackOnboarding("onboarding_view");
  }, [open]);

  const finish = (status: FirstVisitStatus) => {
    dismissFirstVisitForThisLoad();
    const storage = readBrowserStorage();
    if (storage) writeFirstVisitStatus(storage, status);
    setOpen(false);
    publishFirstVisitVisibility();
    trackOnboarding(status === "completed" ? "onboarding_complete" : "onboarding_skip");
  };

  return {
    open,
    activeMainSlide,
    continueSlide() {
      const next = (activeMainSlide >= 2 ? activeMainSlide : activeMainSlide + 1) as MainSlideIndex;
      setActiveMainSlide(next);
    },
    backSlide() {
      const next = (activeMainSlide <= 0 ? activeMainSlide : activeMainSlide - 1) as MainSlideIndex;
      setActiveMainSlide(next);
    },
    skip() {
      finish("skipped");
      if (typeof window === "undefined" || sessionExists()) return;
      requestExternalBrowserPrompt();
      void navigate({ to: "/auth", replace: true });
    },
    complete() {
      finish("completed");
      if (typeof window === "undefined") return;
      if (!sessionExists()) {
        requestExternalBrowserPrompt();
        void navigate({ to: "/auth", replace: true });
        return;
      }
      if (isAppHome(window.location.pathname)) return;
      void navigate({ to: "/", replace: true });
    },
  };
}
