import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
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
    const unsub = subscribeWalletTopUp(setEvent);
    const stop = startWalletTopUpLive(seen.current);
    return () => {
      stop();
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
