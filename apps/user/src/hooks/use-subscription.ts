import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkoutSubscription,
  fetchSubscriptionMe,
  fetchSubscriptionPlans,
  type SubscriptionMe,
} from "@/lib/api/subscriptions";

export function useSubscriptionMe() {
  return useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: fetchSubscriptionMe,
    staleTime: 30_000,
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscriptions", "plans"],
    queryFn: fetchSubscriptionPlans,
    staleTime: 60_000,
  });
}

export function useSubscriptionCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: checkoutSubscription,
    onSuccess: (data) => {
      if (data.me) {
        qc.setQueryData<SubscriptionMe>(["subscriptions", "me"], data.me);
      } else {
        void qc.invalidateQueries({ queryKey: ["subscriptions", "me"] });
      }
      void qc.invalidateQueries({ queryKey: ["wallet", "me"] });
    },
  });
}
