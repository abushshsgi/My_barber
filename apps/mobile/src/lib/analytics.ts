/**
 * Web / default — Firebase Analytics yo'q (noop).
 * Native: `analytics.native.ts` (Android).
 */
export async function logEvent(
  _name: string,
  _params?: Record<string, string | number | boolean>,
): Promise<void> {}

export async function logAppOpen(): Promise<void> {}

export function trackAuthSuccess(_opts: {
  isNewUser: boolean;
  method: "google" | "phone" | "password";
}): void {}

export function trackScreenView(_screenName: string): void {}
