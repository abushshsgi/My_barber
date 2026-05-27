"use client";

import { useEffect } from "react";
import {
  applyReduceMotion,
  USER_PREFS_CHANGED_EVENT,
  USER_PREFS_STORAGE_KEY,
} from "../lib/user-preferences";

/** Applies reduce-motion and listens for preference changes on every page. */
export function UserPreferencesInit() {
  useEffect(() => {
    applyReduceMotion();
    const sync = () => applyReduceMotion();
    window.addEventListener(USER_PREFS_CHANGED_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === USER_PREFS_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(USER_PREFS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
