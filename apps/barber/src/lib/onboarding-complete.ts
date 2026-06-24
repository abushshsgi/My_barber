import { toast } from "sonner";

const SKIP_ACTIVATION_GATE_KEY = "barber_skip_activation_gate";
const SKIP_ACTIVATION_GATE_TTL_MS = 120_000;

/** Onboarding yakunida /barber beforeLoad aktivatsiya tekshiruvini vaqtincha o‘tkazib yuborish. */
export function markOnboardingJustCompleted(): void {
  try {
    sessionStorage.setItem(SKIP_ACTIVATION_GATE_KEY, String(Date.now()));
  } catch {
    /* private mode */
  }
}

export function shouldSkipActivationGate(): boolean {
  try {
    const raw = sessionStorage.getItem(SKIP_ACTIVATION_GATE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < SKIP_ACTIVATION_GATE_TTL_MS;
  } catch {
    return false;
  }
}

export function clearOnboardingJustCompleted(): void {
  try {
    sessionStorage.removeItem(SKIP_ACTIVATION_GATE_KEY);
  } catch {
    /* ignore */
  }
}

type NavigateFn = (opts: { to: string; replace?: boolean }) => void | Promise<void>;

/** Onboarding tugagach darhol dashboardga — overlay kutishsiz. */
export function finishOnboardingAndGo(navigate: NavigateFn, message?: string): void {
  markOnboardingJustCompleted();
  if (message) toast.success(message);
  void navigate({ to: "/barber", replace: true });
}
