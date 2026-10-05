import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { startUserPush } from "../../lib/register-user-push";
import {
  startWalletTopUpLive,
  subscribeWalletTopUp,
  type WalletTopUpEvent,
} from "../../lib/wallet-topup-live";
import { WalletTopUpCelebration } from "./WalletTopUpCelebration";

/** Ilova ochiq turganida admin tasdig'ini real vaqtda ushlaydi. */
export function WalletTopUpLive() {
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<WalletTopUpEvent | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!isAuthenticated) {
      seen.current.clear();
      setEvent(null);
      return;
    }
    let stopLive = () => {};
    let stopPush = () => {};
    let cancelled = false;
    const unsub = subscribeWalletTopUp(setEvent);
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
  }, [isAuthenticated]);

  const close = useCallback(() => setEvent(null), []);

  return (
    <WalletTopUpCelebration
      visible={event != null}
      amount={event?.amount || "0"}
      onClose={close}
    />
  );
}
