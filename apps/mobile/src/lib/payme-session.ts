import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSubscriptionPaymentStatus } from "../api/subscriptions";

const PENDING_KEY = "mysaloon.payme.pending";

type Listener = () => void;
const listeners = new Set<Listener>();

let watching: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let ticks = 0;

export function onPaymeActivated(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPaymeActivated() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* keyingi tinglovchi */
    }
  });
}

export async function rememberPaymeOrder(orderId: string) {
  const id = orderId.trim();
  if (!id.startsWith("sub-")) return;
  await AsyncStorage.setItem(PENDING_KEY, id);
}

export async function clearPaymeOrder() {
  await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
}

export function stopPaymeWatch() {
  watching = null;
  ticks = 0;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Modal yopilganidan keyin ham chek holatini so'raydi va obunani yoqadi. */
export function watchPaymeOrder(orderId: string) {
  const id = orderId.trim();
  if (!id.startsWith("sub-")) return;
  if (watching === id && timer) return;
  stopPaymeWatch();
  watching = id;
  ticks = 0;

  const tick = async () => {
    if (watching !== id) return;
    ticks += 1;
    try {
      const row = await fetchSubscriptionPaymentStatus(id);
      if (watching !== id) return;
      if (row.status === "paid") {
        stopPaymeWatch();
        await clearPaymeOrder();
        notifyPaymeActivated();
        return;
      }
      if (row.status && row.status !== "pending") {
        stopPaymeWatch();
        await clearPaymeOrder();
      }
    } catch {
      /* keyingi urinish */
    }
    if (ticks >= 45) stopPaymeWatch();
  };

  void tick();
  timer = setInterval(() => void tick(), 8000);
}

export async function resumePendingPayme() {
  try {
    const stored = await AsyncStorage.getItem(PENDING_KEY);
    if (stored && stored.startsWith("sub-")) watchPaymeOrder(stored);
  } catch {
    /* saqlangan chek yo'q */
  }
}
