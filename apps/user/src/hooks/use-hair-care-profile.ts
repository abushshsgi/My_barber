import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchHairCareProfile,
  updateHairCareProfile,
  type HairCareProfile,
  type HairCareProfileUpdate,
} from "@/lib/api/hair-care-profile";
import { authQueryEnabled } from "@/lib/auth-query";

export const hairCareProfileQueryKey = ["users", "me", "hair-care-profile"] as const;

export function useHairCareProfile() {
  return useQuery({
    queryKey: hairCareProfileQueryKey,
    queryFn: fetchHairCareProfile,
    enabled: authQueryEnabled(),
    staleTime: 60_000,
  });
}

export function useUpdateHairCareProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: HairCareProfileUpdate) => updateHairCareProfile(body),
    onSuccess: (data) => {
      qc.setQueryData<HairCareProfile>(hairCareProfileQueryKey, data);
    },
  });
}
