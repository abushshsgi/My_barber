"use client";

import { useEffect, useState } from "react";
import {
  readUserPreferences,
  USER_PREFS_CHANGED_EVENT,
  USER_PREFS_STORAGE_KEY,
  type UserPreferences,
} from "../lib/user-preferences";

export function useUserPreferences(): UserPreferences {
  const [prefs, setPrefs] = useState<UserPreferences>(readUserPreferences);

  useEffect(() => {
    const sync = () => setPrefs(readUserPreferences());
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

  return prefs;
}
