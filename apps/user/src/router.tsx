import type { AnyRouter } from "@tanstack/react-router";
import { shouldUsePublicRouterBootstrap } from "@/lib/split-bootstrap";

/**
 * TanStack Start router entry — async bootstrap splits public Explore guests
 * from the full generated route manifest (see `routeTree.public.ts`).
 */
export async function getRouter(): Promise<AnyRouter> {
  if (shouldUsePublicRouterBootstrap()) {
    const { createPublicRouter } = await import("./router.public");
    return createPublicRouter();
  }
  const { createAppRouter } = await import("./router.app");
  return createAppRouter();
}