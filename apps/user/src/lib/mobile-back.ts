import type { RegisteredRouter } from "@tanstack/react-router";

function historyIndex(router: RegisteredRouter): number {
  const state = router.history.location.state as
    | { idx?: number; __TSR_index?: number }
    | undefined;
  if (typeof state?.idx === "number") return state.idx;
  if (typeof state?.__TSR_index === "number") return state.__TSR_index;
  return 0;
}

function sameOriginReferrerPath(): string | null {
  if (typeof document === "undefined" || !document.referrer) return null;
  try {
    const url = new URL(document.referrer);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === window.location.pathname) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Browser tarixida oldingi sahifa bo'lsa orqaga, aks holda fallback. */
export function navigateBack(router: RegisteredRouter, fallback = "/", strict = false) {
  if (!strict) {
    const idx = historyIndex(router);
    if (idx > 0) {
      router.history.back();
      return;
    }
    // Soft nav / to'g'ridan-to'g'ri ochilganda idx 0 bo'lishi mumkin — same-origin referrer.
    if (typeof window !== "undefined" && window.history.length > 1 && sameOriginReferrerPath()) {
      router.history.back();
      return;
    }
  }
  void router.navigate({ to: fallback as never });
}
