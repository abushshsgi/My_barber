import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

function subscribeNative(): () => void {
  return () => undefined;
}

function getNativeSnapshot(): boolean {
  return Capacitor.isNativePlatform();
}

function getServerSnapshot(): boolean {
  return false;
}

/** Capacitor Android/iOS — brauzer/PWA emas. */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(subscribeNative, getNativeSnapshot, getServerSnapshot);
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

/** `document.documentElement` ga `data-native-app` qo‘yish. */
export function applyNativeAppDocumentFlag() {
  if (typeof document === "undefined") return;
  if (Capacitor.isNativePlatform()) {
    document.documentElement.dataset.nativeApp = "true";
    document.documentElement.dataset.nativeBoot = "done";
  } else {
    delete document.documentElement.dataset.nativeApp;
    delete document.documentElement.dataset.nativeBoot;
  }
}
