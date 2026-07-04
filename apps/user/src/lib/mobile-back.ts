import type { RegisteredRouter } from "@tanstack/react-router";

/** Browser tarixida oldingi sahifa bo'lsa orqaga, aks holda fallback. */
export function navigateBack(router: RegisteredRouter, fallback = "/") {
  const idx = (router.history.location.state as { idx?: number } | undefined)?.idx ?? 0;
  if (idx > 0) {
    router.history.back();
    return;
  }
  void router.navigate({ to: fallback as never });
}
