import { useEffect, useRef } from "react";
import { OnboardingCarousel } from "@/components/first-visit/OnboardingCarousel";
import { slideTitle } from "@/components/first-visit/first-visit-copy";
import { useOnboarding } from "@/components/first-visit/useOnboarding";

export function FirstVisitOnboarding() {
  const flow = useOnboarding();
  const rootRef = useRef<HTMLDivElement>(null);
  const title = slideTitle(flow.activeMainSlide);

  useEffect(() => {
    if (!flow.open) return;
    document.documentElement.setAttribute("data-first-visit-open", "");
    return () => {
      document.documentElement.removeAttribute("data-first-visit-open");
    };
  }, [flow.open]);

  useEffect(() => {
    if (!flow.open) return;
    const root = rootRef.current;
    if (!root) return;

    const focusPrimary = () => {
      root
        .querySelector<HTMLElement>(
          `[data-slide="${flow.activeMainSlide}"] [data-testid="first-visit-next"]`,
        )
        ?.focus();
    };
    const frame = window.requestAnimationFrame(focusPrimary);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !rootRef.current) return;
      const items = [
        ...rootRef.current.querySelectorAll<HTMLElement>(
          "button, [href], [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((element) => !element.hasAttribute("disabled") && element.tabIndex >= 0);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [flow.open, flow.activeMainSlide]);

  if (!flow.open) return null;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-visit-title"
      data-testid="first-visit-onboarding"
      className="fixed inset-0 z-[400] h-screen overflow-hidden overscroll-none bg-[#f4ecff]"
      style={{ height: "100dvh" }}
    >
      <style>
        {`html[data-first-visit-open], html[data-first-visit-open] body { overflow: hidden !important; }`}
      </style>
      <div className="absolute inset-0">
        <h2 id="first-visit-title" className="sr-only">
          {title}
        </h2>
        <OnboardingCarousel
          activeMainSlide={flow.activeMainSlide}
          onContinue={flow.continueSlide}
          onComplete={flow.complete}
          onSkip={flow.skip}
        />
      </div>
    </div>
  );
}
