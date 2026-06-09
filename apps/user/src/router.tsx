import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { handleAuthFailure } from "@/lib/api/client";
import { registerQueryClient } from "@/lib/query-client";
import { routeTree } from "./routeTree.gen";

function isAuthQueryError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /token not valid|given token not valid|not authenticated|authentication credentials were not provided/i.test(
    error.message,
  );
}

function onQueryError(error: unknown) {
  if (isAuthQueryError(error)) {
    handleAuthFailure();
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: onQueryError }),
    mutationCache: new MutationCache({ onError: onQueryError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isAuthQueryError(error)) return false;
          return failureCount < 1;
        },
      },
    },
  });
  registerQueryClient(queryClient);

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 0,
  });

  return router;
};
