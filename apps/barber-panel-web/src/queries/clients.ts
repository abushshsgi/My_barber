"use client";

import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { IndependentClientApi } from "@/lib/api-types";

export function useIndependentClients() {
  return useQuery({
    queryKey: ["clients", "independent"],
    queryFn: () => apiJson<IndependentClientApi[]>("/api/v1/analytics/clients/independent/"),
  });
}
