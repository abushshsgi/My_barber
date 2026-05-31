import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { userProfile, type Audience, type Category } from "@/lib/mock-data";

export type AudienceFilter = Audience | "all";

const AUDIENCE_KEY = "mysaloon.audience";
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

function readPrefsPreferredAudience(): AudienceFilter | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw).preferredAudience;
    return isValidAudienceFilter(v) ? v : null;
  } catch {
    return null;
  }
}

function writePrefsPreferredAudience(v: AudienceFilter) {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const prefs = raw ? JSON.parse(raw) : {};
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, preferredAudience: v }));
  } catch {
    /* noop */
  }
}

export function getProfileDefaultAudience(): AudienceFilter {
  const fromPrefs = readPrefsPreferredAudience();
  if (fromPrefs) return fromPrefs;
  const fromProfile = userProfile.preferredAudience;
  if (fromProfile === "men" || fromProfile === "women") return fromProfile;
  return "all";
}

function readInitialAudience(): AudienceFilter {
  try {
    const stored = localStorage.getItem(AUDIENCE_KEY);
    if (isValidAudienceFilter(stored)) return stored;
  } catch {
    /* noop */
  }
  return getProfileDefaultAudience();
}

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [audience, setAudienceState] = useState<AudienceFilter>(readInitialAudience);
  const profileDefault = getProfileDefaultAudience();

  useEffect(() => {
    setAudienceState(readInitialAudience());
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUDIENCE_KEY && isValidAudienceFilter(e.newValue)) {
        setAudienceState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setAudience = useCallback((v: AudienceFilter) => {
    setAudienceState(v);
    try {
      localStorage.setItem(AUDIENCE_KEY, v);
      writePrefsPreferredAudience(v);
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

/** Erkak/Ayol tanlanganda faqat shu auditoriyaga mos kontent (unisex ham kirmaydi). */
export function matchAudience(itemAudience: Audience, filter: AudienceFilter): boolean {
  if (filter === "all") return true;
  return itemAudience === filter;
}

export function categoriesForAudience(a: AudienceFilter): (Category | "all")[] {
  if (a === "men") return ["all", "barber"];
  if (a === "women") return ["all", "beauty", "nails", "spa"];
  return ["all", "barber", "beauty", "nails", "spa"];
}
