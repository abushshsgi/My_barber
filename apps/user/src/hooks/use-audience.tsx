import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { type Audience, type Category } from "@/lib/mock-data";
import { getAuthUserId } from "@/lib/auth-user";
import {
  AUDIENCE_RESET_EVENT,
  audienceKey,
  prefsKey,
  readScopedAudience,
  readScopedPrefsRaw,
  writeScopedAudience,
  writeScopedPrefsRaw,
} from "@/lib/user-prefs";

export type AudienceFilter = Audience | "all";

/** @deprecated Use prefsKey(userId) from user-prefs — kept for settings import compatibility */
export const PREFS_KEY = "mysaloon.prefs";

type AudienceContextValue = {
  audience: AudienceFilter;
  setAudience: (v: AudienceFilter) => void;
  profileDefault: AudienceFilter;
};

const AudienceContext = createContext<AudienceContextValue | null>(null);

function isValidAudienceFilter(v: unknown): v is AudienceFilter {
  return v === "men" || v === "women" || v === "all";
}

function readPrefsPreferredAudience(userId: number | null): AudienceFilter | null {
  try {
    const raw = userId != null ? readScopedPrefsRaw(userId) : localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw).preferredAudience;
    return isValidAudienceFilter(v) ? v : null;
  } catch {
    return null;
  }
}

function writePrefsPreferredAudience(userId: number | null, v: AudienceFilter) {
  try {
    if (userId != null) {
      const raw = readScopedPrefsRaw(userId);
      const prefs = raw ? JSON.parse(raw) : {};
      writeScopedPrefsRaw(userId, JSON.stringify({ ...prefs, preferredAudience: v }));
      return;
    }
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, preferredAudience: v }));
  } catch {
    /* noop */
  }
}

export function getProfileDefaultAudience(): AudienceFilter {
  const fromPrefs = readPrefsPreferredAudience(getAuthUserId());
  if (fromPrefs) return fromPrefs;
  return "all";
}

/** AI Style: profil (erkak/ayol) bo'yicha — «Hammasi» ishlatilmaydi. */
export function resolveAiStyleAudience(
  profileDefault: AudienceFilter,
  audience: AudienceFilter,
): Audience {
  if (profileDefault === "men" || profileDefault === "women") return profileDefault;
  if (audience === "men" || audience === "women") return audience;
  return "men";
}

function readInitialAudience(userId: number | null): AudienceFilter {
  try {
    if (userId != null) {
      const stored = readScopedAudience(userId);
      if (isValidAudienceFilter(stored)) return stored;
    } else {
      const stored = localStorage.getItem("mysaloon.audience");
      if (isValidAudienceFilter(stored)) return stored;
    }
  } catch {
    /* noop */
  }
  return readPrefsPreferredAudience(userId) ?? "all";
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(() => getAuthUserId());
  const [audience, setAudienceState] = useState<AudienceFilter>(() => readInitialAudience(userId));
  const profileDefault = readPrefsPreferredAudience(userId) ?? "all";

  const reloadAudience = useCallback((uid: number | null) => {
    setUserId(uid);
    setAudienceState(readInitialAudience(uid));
  }, []);

  useEffect(() => {
    reloadAudience(getAuthUserId());
  }, [reloadAudience]);

  useEffect(() => {
    const onReset = (e: Event) => {
      const detail = (e as CustomEvent<number | null>).detail;
      if (typeof detail === "number") {
        reloadAudience(detail);
        return;
      }
      reloadAudience(getAuthUserId());
    };
    window.addEventListener(AUDIENCE_RESET_EVENT, onReset);
    return () => window.removeEventListener(AUDIENCE_RESET_EVENT, onReset);
  }, [reloadAudience]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      const uid = getAuthUserId();
      if (uid != null && e.key === audienceKey(uid) && isValidAudienceFilter(e.newValue)) {
        setAudienceState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAudience = useCallback((v: AudienceFilter) => {
    const uid = getAuthUserId();
    setAudienceState(v);
    try {
      if (uid != null) {
        writeScopedAudience(uid, v);
      } else {
        localStorage.setItem("mysaloon.audience", v);
      }
      writePrefsPreferredAudience(uid, v);
    } catch {
      /* noop */
    }
  }, []);

  return (
    <AudienceContext.Provider value={{ audience, setAudience, profileDefault }}>
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience() {
  const ctx = useContext(AudienceContext);
  if (!ctx) {
    throw new Error("useAudience must be used within AudienceProvider");
  }
  return ctx;
}

export function audienceToCategory(a: AudienceFilter): Category | "all" {
  if (a === "men") return "barber";
  if (a === "women") return "beauty";
  return "all";
}

/** Xarita: profil (erkak/ayol) bo'yicha avtomatik filter — chip yo'q. */
export function resolveMapAudienceFilter(profileDefault: AudienceFilter): AudienceFilter {
  if (profileDefault === "men" || profileDefault === "women") return profileDefault;
  return "all";
}

/** Erkak/Ayol tanlanganda faqat shu auditoriyaga mos kontent (unisex ham kirmaydi). */
export function matchAudience(itemAudience: Audience, filter: AudienceFilter): boolean {
  if (filter === "all") return true;
  return itemAudience === filter;
}

/** Usta jinsi: erkak → male, ayol → female. Bo‘sh gender eski ma’lumotlar uchun o‘tkaziladi. */
export function matchBarberGender(
  gender: "male" | "female" | "" | undefined,
  filter: AudienceFilter,
): boolean {
  if (filter === "all") return true;
  if (!gender) return true;
  if (filter === "men") return gender === "male";
  if (filter === "women") return gender === "female";
  return true;
}

export function categoriesForAudience(a: AudienceFilter): (Category | "all")[] {
  if (a === "men") return ["all", "barber"];
  if (a === "women") return ["all", "beauty", "nails"];
  return ["all", "barber", "beauty", "nails"];
}

/** Settings sahifasi uchun user-scoped prefs kaliti */
export function getPrefsStorageKey(): string {
  const uid = getAuthUserId();
  return uid != null ? prefsKey(uid) : PREFS_KEY;
}
