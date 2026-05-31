import { useEffect, useState } from "react";
import { userProfile, type Audience, type Category } from "@/lib/mock-data";

export type AudienceFilter = Audience | "all";

const AUDIENCE_KEY = "mysaloon.audience";
export const PREFS_KEY = "mysaloon.prefs";

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

export function useAudience() {
  const [audience, setAudienceState] = useState<AudienceFilter>(readInitialAudience);
  const profileDefault = getProfileDefaultAudience();

  useEffect(() => {
    setAudienceState(readInitialAudience());
  }, []);

  const setAudience = (v: AudienceFilter) => {
    setAudienceState(v);
    try {
      localStorage.setItem(AUDIENCE_KEY, v);
      writePrefsPreferredAudience(v);
    } catch {
      /* noop */
    }
  };

  return { audience, setAudience, profileDefault };
}

export function audienceToCategory(a: AudienceFilter): Category | "all" {
  if (a === "men") return "barber";
  if (a === "women") return "beauty";
  return "all";
}

export function matchAudience(salonAudience: Audience, filter: AudienceFilter): boolean {
  if (filter === "all") return true;
  if (salonAudience === "unisex") return true;
  return salonAudience === filter;
}
