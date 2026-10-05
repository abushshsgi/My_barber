import { AppState } from "react-native";
import { API_ORIGIN } from "../api/config";
import { fetchMyCardDeposits, type CardDeposit } from "../api/wallet";
import { getAccessToken } from "../auth/storage";

export type WalletTopUpEvent = {
  depositId: string;
  amount: string;
};

const topUpListeners = new Set<(event: WalletTopUpEvent) => void>();
const refreshListeners = new Set<() => void>();

export function subscribeWalletTopUp(listener: (event: WalletTopUpEvent) => void) {
  topUpListeners.add(listener);
  return () => {
    topUpListeners.delete(listener);
  };
}

export function subscribeWalletRefresh(listener: () => void) {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

export function emitWalletTopUp(event: WalletTopUpEvent) {
  refreshListeners.forEach((listener) => listener());
  topUpListeners.forEach((listener) => listener(event));
}

function wsUrl(token: string): string {
  const origin = API_ORIGIN.replace(/^http/i, "ws");
  return `${origin}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

function rememberApproved(rows: CardDeposit[], seen: Set<string>, announce: boolean) {
  for (const row of rows) {
    if (row.status !== "approved") continue;
    if (!announce || seen.has(row.id)) {
      seen.add(row.id);
      continue;
    }
    seen.add(row.id);
    emitWalletTopUp({ depositId: row.id, amount: String(row.amount) });
  }
}

/** Admin tasdiqlaganda animatsiya: websocket + qisqa poll zaxirasi. */
export function startWalletTopUpLive(seen: Set<string>): () => void {
  let cancelled = false;
  let ready = false;
  let socket: WebSocket | null = null;
  let reconnect: ReturnType<typeof setTimeout> | null = null;
  let poll: ReturnType<typeof setTimeout> | null = null;

  const schedule = (ms: number) => {
    if (poll) clearTimeout(poll);
    poll = setTimeout(() => {
      void pollOnce();
    }, ms);
  };

  const pollOnce = async () => {
    try {
      const rows = await fetchMyCardDeposits();
      if (cancelled) return;
      rememberApproved(rows, seen, ready);
      ready = true;
      const waiting = rows.some((row) => row.status === "claimed" || row.status === "awaiting_payment");
      schedule(waiting ? 4000 : 15000);
    } catch {
      if (!cancelled) schedule(8000);
    }
  };

  const connect = async () => {
    const token = await getAccessToken();
    if (!token || cancelled) return;
    socket = new WebSocket(wsUrl(token));
    socket.onmessage = (message) => {
      try {
        const data = JSON.parse(String(message.data)) as {
          type?: string;
          id?: number;
          payload?: { deposit_id?: string; entry_id?: string; amount?: string };
        };
        if (data.type !== "wallet_topup") return;
        const depositId = String(data.payload?.deposit_id || data.payload?.entry_id || "");
        if (!depositId || seen.has(depositId)) return;
        seen.add(depositId);
        emitWalletTopUp({
          depositId,
          amount: String(data.payload?.amount || ""),
        });
      } catch {
        /* noto'g'ri kadr */
      }
    };
    socket.onclose = () => {
      if (cancelled) return;
      reconnect = setTimeout(() => {
        void connect();
      }, 4000);
    };
  };

  void pollOnce();
  void connect();

  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") void pollOnce();
  });

  return () => {
    cancelled = true;
    sub.remove();
    if (reconnect) clearTimeout(reconnect);
    if (poll) clearTimeout(poll);
    socket?.close();
  };
}
