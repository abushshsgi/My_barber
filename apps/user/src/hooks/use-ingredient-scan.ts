import { useMutation } from "@tanstack/react-query";
import { scanIngredient, type IngredientScanResponse } from "@/lib/api/ai";

export function useIngredientScan() {
  return useMutation({
    mutationFn: (image: string) => scanIngredient(image),
  });
}

export type { IngredientScanResponse };
