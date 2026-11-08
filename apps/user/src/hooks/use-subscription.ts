import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  checkoutSubscription,
  fetchSubscriptionMe,
  fetchSubscriptionPlans,
  fetchSubscriptionPromos,
  previewSubscriptionPromo,
  type SubscriptionMe,
} from "@/lib/api/subscriptions";

export function useSubscriptionMe() {
  return useQuery({
    queryKey: ["subscriptions", "me"],
    queryFn: fetchSubscriptionMe,
    staleTime: 8_000,
    refetchOnWindowFocus: true,
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscriptions", "plans"],
    queryFn: fetchSubscriptionPlans,
    staleTime: 60_000,
  });
}

export function useSubscriptionPromos() {
  return useQuery({
    queryKey: ["subscriptions", "promos"],
    queryFn: fetchSubscriptionPromos,
    staleTime: 60_000,
  });
}

export function useSubscriptionPromoPreview() {
  return useMutation({
    mutationFn: previewSubscriptionPromo,
  });
}

export function useSubscriptionCancel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancelSubscription,
    onSuccess: (data) => {
      if (data.me) {
        qc.setQueryData<SubscriptionMe>(["subscriptions", "me"], data.me);
      }
      void qc.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}

export function useSubscriptionCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: checkoutSubscription,
    onSuccess: () => {
      // Checkout faqat Payme oynasini ochadi — limit/obuna hali yangilanmaydi.
      void qc.invalidateQueries({ queryKey: ["subscriptions"] });
    },
  });
}
