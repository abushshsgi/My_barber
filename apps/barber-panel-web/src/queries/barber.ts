"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import type { BarberMeApi, BarberProfileApi } from "@/lib/api-types";

export function useBarberMe() {
  return useQuery({
    queryKey: ["barber", "me"],
    queryFn: () => apiJson<BarberMeApi>("/api/v1/barber/auth/me/"),
  });
}

export function useBarberProfile() {
  return useQuery({
    queryKey: ["barber", "profile"],
    queryFn: () => apiJson<BarberProfileApi>("/api/v1/barber/profile/"),
  });
}

export function useUpdateBarberProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<{ location_text: string; latitude: number; longitude: number }>) =>
      apiJson<{ status: "ok" } & Record<string, unknown>>("/api/v1/barber/profile/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["barber", "profile"] });
    },
  });
}
