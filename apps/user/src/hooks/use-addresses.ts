import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUserAddress,
  deleteUserAddress,
  fetchUserAddresses,
  setDefaultUserAddress,
  updateUserAddress,
  type UserAddressPayload,
} from "@/lib/api/addresses";
import { getAuthUserId } from "@/lib/auth-user";
import { authQueryEnabled } from "@/lib/auth-query";
import { meQueryKeyFor } from "@/hooks/use-me";
import { salonsQueryKey } from "@/hooks/use-salons";
import { userQueryKey } from "@/lib/query-keys";

export const addressesQueryKey = ["users", "addresses"] as const;

function addressesKey(userId: number | null) {
  return userQueryKey(addressesQueryKey, userId);
}

function invalidateLocationQueries(qc: ReturnType<typeof useQueryClient>, userId: number | null) {
  void qc.invalidateQueries({ queryKey: addressesKey(userId) });
  void qc.invalidateQueries({ queryKey: meQueryKeyFor(userId) });
  void qc.invalidateQueries({ queryKey: salonsQueryKey });
}

export function useUserAddresses() {
  const userId = getAuthUserId();
  return useQuery({
    queryKey: addressesKey(userId),
    queryFn: fetchUserAddresses,
    enabled: authQueryEnabled(!!userId),
    staleTime: 30_000,
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: (data: UserAddressPayload) => createUserAddress(data),
    onSuccess: () => invalidateLocationQueries(qc, userId),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserAddressPayload> }) =>
      updateUserAddress(id, data),
    onSuccess: () => invalidateLocationQueries(qc, userId),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: (id: number) => deleteUserAddress(id),
    onSuccess: () => invalidateLocationQueries(qc, userId),
  });
}

export function useSetDefaultAddress() {
  const qc = useQueryClient();
  const userId = getAuthUserId();
  return useMutation({
    mutationFn: (id: number) => setDefaultUserAddress(id),
    onSuccess: () => invalidateLocationQueries(qc, userId),
  });
}
