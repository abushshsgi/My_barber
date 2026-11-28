import { createRouter } from "@tanstack/react-router";
import { createAppQueryClient } from "@/lib/create-app-query-client";
import { routeTree } from "./routeTree.gen";

export function createAppRouter() {
  const queryClient = createAppQueryClient();

  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: false,
    defaultPreloadStaleTime: 60_000,
    defaultPendingMs: 150,
  });
}