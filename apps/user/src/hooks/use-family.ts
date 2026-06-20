import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFamilyMember,
  deleteFamilyMember,
  fetchFamilyMembers,
  updateFamilyMember,
  type FamilyMemberPayload,
} from "@/lib/api/family";
import { getAuthUserId } from "@/lib/auth-user";
import { authQueryEnabled } from "@/lib/auth-query";
import { userQueryKey } from "@/lib/query-keys";

export const familyQueryKey = ["users", "family"] as const;

function familyKey(userId: number | null) {
  return userQueryKey(familyQueryKey, userId);
}

export function useFamilyMembers() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: familyKey(userId),
    queryFn: fetchFamilyMembers,
    enabled: authQueryEnabled(!!userId),
    staleTime: 30_000,
  });
}

export function useCreateFamilyMember() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: (data: FamilyMemberPayload) => createFamilyMember(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: familyKey(userId) }),
  });
}

export function useUpdateFamilyMember() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<FamilyMemberPayload> }) =>
      updateFamilyMember(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: familyKey(userId) }),
  });
}

export function useDeleteFamilyMember() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: (id: number) => deleteFamilyMember(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: familyKey(userId) }),
  });
}
