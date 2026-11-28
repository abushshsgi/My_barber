import { createRouter } from "@tanstack/react-router";
import { createAppQueryClient } from "@/lib/create-app-query-client";
import {
  markPublicBootstrapActive,
  scheduleFullRouterPreload,
} from "@/lib/split-bootstrap";
import { publicRouteTree } from "./routeTree.public";

export function createPublicRouter() {
  const queryClient = createAppQueryClient();
  markPublicBootstrapActive();
  scheduleFullRouterPreload();

  return createRouter({
    routeTree: publicRouteTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: false,
    defaultPreloadStaleTime: 60_000,
    defaultPendingMs: 150,
  });
}