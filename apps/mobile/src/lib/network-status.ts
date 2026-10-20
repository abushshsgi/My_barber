import { AppState } from "react-native";
import { API_BASE, API_ORIGIN } from "../api/config";

type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let probing = false;

const PROBE_INTERVAL_MS = 8_000;
const PROBE_TIMEOUT_MS = 6_000;

function emit() {
  for (const l of listeners) l(online);
}

/** Server javob berdi (har qanday HTTP status) — internet bor. */
export function markOnline() {
  if (online) return;
  online = true;
  stopProbe();
  emit();
}

/** Fetch tarmoq xatosi — internet yo'q. Sessiya o'chirilmaydi. */
export function markOffline() {
  if (!online) return;
  online = false;
  emit();
  scheduleProbe(PROBE_INTERVAL_MS);
}

export function isOnline() {
  return online;
}

export function subscribeNetwork(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function stopProbe() {
  if (probeTimer) clearTimeout(probeTimer);
  probeTimer = null;
}

function scheduleProbe(ms: number) {
  stopProbe();
  probeTimer = setTimeout(() => {
    void probeNetwork();
  }, ms);
}

/** Internet qaytganini tekshirish — yengil `health/` so'rovi. */
export async function probeNetwork(): Promise<boolean> {
  if (probing) return online;
  probing = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const base = API_ORIGIN || API_BASE;
    await fetch(`${base}/health/`, { method: "GET", signal: controller.signal });
    markOnline();
    return true;
  } catch {
    if (!online) scheduleProbe(PROBE_INTERVAL_MS);
    return false;
  } finally {
    clearTimeout(timer);
    probing = false;
  }
}

AppState.addEventListener("change", (state) => {
  if (state === "active" && !online) void probeNetwork();
});
