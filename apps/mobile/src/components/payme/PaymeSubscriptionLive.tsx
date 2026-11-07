import { useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { resumePendingPayme, stopPaymeWatch } from "../../lib/payme-session";

/** Ilova qayta ochilganda tugallanmagan Payme chekini serverdan tekshiradi. */
export function PaymeSubscriptionLive() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      stopPaymeWatch();
      return;
    }
    void resumePendingPayme();
  }, [isAuthenticated]);

  return null;
}
