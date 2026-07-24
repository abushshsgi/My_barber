import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkoutShopSubscription,
  confirmShopSubscription,
  fetchShopPlans,
  fetchShopSubscriptionMe,
  type ShopPlanCode,
  type ShopSubscriptionMe,
} from "@/lib/shop-subscription";

export const shopSubKeys = {
  me: ["barber", "shop-subscription", "me"] as const,
  plans: ["barber", "shop-subscription", "plans"] as const,
};

export function useShopSubscriptionMe(enabled = true) {
  return useQuery({
    queryKey: shopSubKeys.me,
    queryFn: fetchShopSubscriptionMe,
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useShopPlans(enabled = true) {
  return useQuery({
    queryKey: shopSubKeys.plans,
    queryFn: fetchShopPlans,
    enabled,
    staleTime: 60_000,
  });
}

export function useShopCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: checkoutShopSubscription,
    onSuccess: (data) => {
      if (data.me) {
        qc.setQueryData(shopSubKeys.me, data.me);
      } else {
        void qc.invalidateQueries({ queryKey: shopSubKeys.me });
      }
    },
  });
}

export function useShopConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: confirmShopSubscription,
    onSuccess: (data) => {
      if (data.me) qc.setQueryData(shopSubKeys.me, data.me);
      else void qc.invalidateQueries({ queryKey: shopSubKeys.me });
    },
  });
}

export function shopPlanLabel(code: ShopPlanCode | string | null | undefined) {
  if (code === "start") return "Start";
  if (code === "business") return "Business";
  if (code === "pro") return "Pro";
  return code || "—";
}

export function useHasShopSubscription(): {
  loading: boolean;
  has: boolean;
  me: ShopSubscriptionMe | undefined;
} {
  const q = useShopSubscriptionMe();
  return {
    loading: q.isLoading,
    has: Boolean(q.data?.has_subscription && q.data.subscription?.is_active),
    me: q.data,
  };
}
