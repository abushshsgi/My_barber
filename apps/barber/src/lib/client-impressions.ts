import type { LucideIcon } from "lucide-react";
import { Clock3, Heart, Smile, Star, ThumbsUp } from "lucide-react";

export type ClientImpressionKind = "polite" | "great" | "punctual" | "friendly" | "vip";

export type ClientImpressionStat = Partial<Record<ClientImpressionKind, number>>;

export const CLIENT_IMPRESSION_OPTIONS: ReadonlyArray<{
  kind: ClientImpressionKind;
  icon: LucideIcon;
  label: string;
}> = [
  { kind: "polite", icon: Smile, label: "Hushmuomala" },
  { kind: "great", icon: ThumbsUp, label: "Yaxshi ishladi" },
  { kind: "punctual", icon: Clock3, label: "Vaqtida keldi" },
  { kind: "friendly", icon: Heart, label: "Yoqimli" },
  { kind: "vip", icon: Star, label: "Ajoyib mijoz" },
];

export function normalizeImpressionStats(raw: unknown): ClientImpressionStat {
  if (!raw || typeof raw !== "object") return {};
  const out: ClientImpressionStat = {};
  for (const opt of CLIENT_IMPRESSION_OPTIONS) {
    const n = Number((raw as Record<string, unknown>)[opt.kind]);
    if (Number.isFinite(n) && n > 0) out[opt.kind] = n;
  }
  return out;
}
