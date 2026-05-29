import { useEffect, useState } from "react";
import type { Audience } from "@/lib/mock-data";

export type AudienceFilter = Audience | "all";

const KEY = "mysaloon.audience";

export function useAudience() {
  const [audience, setAudienceState] = useState<AudienceFilter>("all");

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY) as AudienceFilter | null;
      if (v === "men" || v === "women" || v === "unisex" || v === "all") {
        setAudienceState(v);
      }
    } catch {}
  }, []);

  const setAudience = (v: AudienceFilter) => {
    setAudienceState(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  };

  return { audience, setAudience };
}

export function matchAudience(salonAudience: Audience, filter: AudienceFilter): boolean {
  if (filter === "all") return true;
  if (salonAudience === "unisex") return true;
  return salonAudience === filter;
}
