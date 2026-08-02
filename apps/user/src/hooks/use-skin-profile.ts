import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSkinProfile,
  updateSkinProfile,
  type SkinProfile,
  type SkinProfileUpdate,
} from "@/lib/api/skin-profile";
import { authQueryEnabled } from "@/lib/auth-query";

export const skinProfileQueryKey = ["users", "me", "skin-profile"] as const;

export function useSkinProfile() {
  return useQuery({
    queryKey: skinProfileQueryKey,
    queryFn: fetchSkinProfile,
    enabled: authQueryEnabled(),
    staleTime: 60_000,
  });
}

export function useUpdateSkinProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SkinProfileUpdate) => updateSkinProfile(body),
    onSuccess: (data) => {
      qc.setQueryData<SkinProfile>(skinProfileQueryKey, data);
    },
  });
}
