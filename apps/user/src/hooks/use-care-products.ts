import { useQuery } from "@tanstack/react-query";
import { fetchCareProduct, fetchCareProducts } from "@/lib/api/care-products";

export const careProductsQueryKey = ["ai", "care", "products"] as const;

export function useCareProducts(params?: {
  q?: string;
  category?: string;
  recommended?: boolean;
}) {
  return useQuery({
    queryKey: [...careProductsQueryKey, params?.category || "", params?.q || "", params?.recommended ? "rec" : "all"],
    queryFn: () => fetchCareProducts(params),
    staleTime: 30_000,
  });
}

export function useCareProduct(id: number) {
  return useQuery({
    queryKey: [...careProductsQueryKey, id],
    queryFn: () => fetchCareProduct(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 60_000,
  });
}
