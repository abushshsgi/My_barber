export type PaywallReason = "subscription" | "limit" | "studio";

export type MorphReturnTo =
  | "MorphChat"
  | "MorphCapture"
  | "MorphStudio"
  | "MorphResults"
  | "MorphPreview"
  | "MorphHome"
  | "MorphGuide";

export type MorphReturnState = {
  returnTo: MorphReturnTo;
  reason?: PaywallReason;
  draft?: string;
  chatOpen?: boolean;
};

let pending: MorphReturnState | null = null;

export function rememberMorphReturn(state: MorphReturnState): void {
  pending = state;
}

export function peekMorphReturn(): MorphReturnState | null {
  return pending;
}

export function consumeMorphReturn(): MorphReturnState | null {
  const next = pending;
  pending = null;
  return next;
}

type PaywallNav = {
  navigate: (name: "MorphPaywall", params?: { reason?: PaywallReason; returnTo?: MorphReturnTo }) => void;
};

/** Morph stack ichidan paywall ochish — xarididan keyin shu oyna tiklanadi. */
export function presentMorphPaywall(
  navigation: PaywallNav,
  reason: PaywallReason,
  returnTo: MorphReturnTo,
): void {
  rememberMorphReturn({ returnTo, reason });
  navigation.navigate("MorphPaywall", { reason, returnTo });
}
