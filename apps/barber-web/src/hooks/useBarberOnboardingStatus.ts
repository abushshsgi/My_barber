"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type BarberOnboardingStatus = {
  is_complete?: boolean;
  required_next_path?: string;
  flow?: string | null;
  work_mode?: string | null;
  has_location?: boolean;
  has_services?: boolean;
  has_working_hours?: boolean;
  owns_salon?: boolean;
  salon_id?: number | null;
  active_membership_id?: number | null;
  owner_membership_id?: number | null;
  has_membership_hours?: boolean;
};

async function fetchBarberOnboardingStatus(): Promise<BarberOnboardingStatus> {
  const res = await apiFetch("/api/v1/barber/onboarding/status/");
  if (!res.ok) {
    throw new Error("Failed to load onboarding status");
  }
  return (await res.json()) as BarberOnboardingStatus;
}

export function useBarberOnboardingStatus(enabled = true) {
  return useQuery({
    queryKey: ["barber", "onboarding", "status"],
    queryFn: fetchBarberOnboardingStatus,
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

