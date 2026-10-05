import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGiftDesigns,
  fetchMyCardDeposits,
  fetchReceivedGifts,
  openWallet,
  parseWalletBalance,
  searchWalletRecipients,
  type ApiGiftDesign,
  type ApiReceivedGift,
  type ApiWalletMe,
  type ApiWalletRecipient,
  type CardDeposit,
} from "../api/wallet";
import type { WalletTx } from "../lib/wallet-format";
import { loadWallet, loadWalletTx, peekWallet, peekWalletTx } from "../lib/wallet-home-cache";
import { subscribeWalletRefresh } from "../lib/wallet-topup-live";
import { isWalletOpened, markWalletOpened } from "../lib/wallet-onboarding";
import { useAuth } from "../auth/AuthContext";

export { parseWalletBalance, openWallet };

export function useWalletMe() {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const known = userId ? peekWallet(userId) : null;
  const [wallet, setWallet] = useState<ApiWalletMe | null>(known);
  const [loading, setLoading] = useState(!known);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => subscribeWalletRefresh(refresh), [refresh]);

  useEffect(() => {
    if (!userId) {
      setWallet(null);
      setLoading(false);
      return;
    }
    const cached = peekWallet(userId);
    if (cached) setWallet(cached);
    let cancelled = false;
    if (!cached) setLoading(true);
    loadWallet(userId)
      .then((w) => {
        if (!cancelled) {
          setWallet(w);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled && !peekWallet(userId)) {
          setError(e.message);
          setWallet(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return {
    wallet,
    balance: wallet ? parseWalletBalance(wallet.balance) : 0,
    walletNumber: wallet?.wallet_number ?? "",
    card: wallet?.card,
    isFrozen: Boolean(wallet?.is_frozen),
    frozenAt: wallet?.frozen_at ?? null,
    freezeReason: wallet?.freeze_reason ?? "",
    loading,
    error,
    refresh,
  };
}

export function useWalletTransactions(
  direction: "all" | "in" | "out" = "all",
  entryType?: string,
  pageSize = 50,
) {
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : "";
  const known = userId ? peekWalletTx(userId, direction, entryType, pageSize) : null;
  const [items, setItems] = useState<WalletTx[]>(known ?? []);
  const [loading, setLoading] = useState(known == null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => subscribeWalletRefresh(refresh), [refresh]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const cached = peekWalletTx(userId, direction, entryType, pageSize);
    if (cached) setItems(cached);
    let cancelled = false;
    if (!cached) setLoading(true);
    loadWalletTx(userId, direction, entryType, pageSize)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled && !peekWalletTx(userId, direction, entryType, pageSize)) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, direction, entryType, pageSize, tick]);

  return { items, loading, refresh };
}

export function useWalletGate() {
  const { user } = useAuth();
  const me = useWalletMe();
  const tx = useWalletTransactions("all");
  const [opened, setOpened] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setOpened(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const flag = await isWalletOpened(user.id);
      if (cancelled) return;
      // Web/eski foydalanuvchi: balans yoki tranzaksiya bo'lsa onboarding o'tkaziladi.
      if (flag || me.balance > 0 || tx.items.length > 0) {
        if (!flag && user.id) await markWalletOpened(user.id);
        if (!cancelled) setOpened(true);
      } else if (!me.loading && !tx.loading) {
        setOpened(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, me.balance, me.loading, tx.items.length, tx.loading]);

  const open = useCallback(async () => {
    if (!user?.id || opening) return;
    setOpening(true);
    try {
      await openWallet();
      await markWalletOpened(user.id);
      setOpened(true);
      me.refresh();
      tx.refresh();
    } finally {
      setOpening(false);
    }
    // refresh fns are stable enough for this gate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, opening]);

  return {
    ready: opened !== null && !me.loading,
    needsOnboarding: opened === false,
    opening,
    open,
    me,
    tx,
  };
}

export function useGiftDesigns() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<ApiGiftDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setDesigns([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchGiftDesigns()
      .then((d) => {
        if (!cancelled) setDesigns(d);
      })
      .catch(() => {
        if (!cancelled) setDesigns([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { designs, loading };
}

export function useReceivedGifts() {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<ApiReceivedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user?.id) {
      setGifts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchReceivedGifts({ page_size: 50 })
      .then((g) => {
        if (!cancelled) setGifts(g);
      })
      .catch(() => {
        if (!cancelled) setGifts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, tick]);

  return { gifts, loading, refresh };
}

export function useRecipientSearch(q: string) {
  const { user } = useAuth();
  const [results, setResults] = useState<ApiWalletRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user?.id || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(() => {
      searchWalletRecipients(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user?.id, q]);

  return { results, loading };
}

export function useCardDeposits(poll?: boolean) {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState<CardDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user?.id) {
      setDeposits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = () => {
      fetchMyCardDeposits()
        .then((d) => {
          if (!cancelled) setDeposits(d);
        })
        .catch(() => {
          if (!cancelled) setDeposits([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    if (!poll) return () => {
      cancelled = true;
    };
    const id = setInterval(load, 8_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id, tick, poll]);

  return { deposits, loading, refresh };
}
