import { useSyncExternalStore } from "react";

function subscribeNative(): () => void {
  return () => undefined;
}

function getNativeSnapshot(): boolean {
  return false;
}

function getServerSnapshot(): boolean {
  return false;
}

/** Web flag — native Expo `apps/mobile` da. */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(subscribeNative, getNativeSnapshot, getServerSnapshot);
}

export function isNativeApp(): boolean {
  return false;
}

export function applyNativeAppDocumentFlag() {
  if (typeof document === "undefined") return;
  delete document.documentElement.dataset.nativeApp;
  delete document.documentElement.dataset.nativeBoot;
}
