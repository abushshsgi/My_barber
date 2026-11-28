import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { handleAuthFailure } from "@/lib/api/client";
import { registerQueryClient } from "@/lib/query-client";

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

export function createAppQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: onQueryError }),
    mutationCache: new MutationCache({ onError: onQueryError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 10 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isAuthQueryError(error)) return false;
          return failureCount < 1;
        },
      },
    },
  });
  registerQueryClient(queryClient);
  return queryClient;
}