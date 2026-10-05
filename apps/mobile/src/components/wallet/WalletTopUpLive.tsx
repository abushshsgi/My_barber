import { useEffect, useRef } from "react";
import { parseWalletBalance } from "../../api/wallet";
import { useAuth } from "../../auth/AuthContext";
import { useAppToast } from "../ui/ToastProvider";
import { startUserPush } from "../../lib/register-user-push";
import { formatSomLabel } from "../../lib/wallet-format";
import { loadNotifications } from "../../lib/notification-cache";
import { startWalletTopUpLive, subscribeWalletTopUp } from "../../lib/wallet-topup-live";

/** Ilova ochiq turganida admin tasdig'ini real vaqtda ushlaydi. */
export function WalletTopUpLive() {
  const { isAuthenticated } = useAuth();
  const toast = useAppToast();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated) {
      seen.current.clear();
      return;
    }
    void loadNotifications().catch(() => {});
    let stopLive = () => {};
    let stopPush = () => {};
    let cancelled = false;
    const unsub = subscribeWalletTopUp((event) => {
      const label = formatSomLabel(parseWalletBalance(event.amount));
      toast.show(`Hisobingizga qo'shildi · +${label}`, { tone: "success", durationMs: 3200 });
    });
    stopLive = startWalletTopUpLive(seen.current);
    void startUserPush(seen.current)
      .then((stop) => {
        if (cancelled) stop();
        else stopPush = stop;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stopPush();
      stopLive();
      unsub();
    };
  }, [isAuthenticated, toast]);

  return null;
}
