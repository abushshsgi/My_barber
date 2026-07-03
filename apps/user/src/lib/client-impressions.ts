import type { LucideIcon } from "lucide-react";
import { Clock3, Heart, Smile, Star, ThumbsUp } from "lucide-react";

export type ClientImpressionKind = "polite" | "great" | "punctual" | "friendly" | "vip";

export const CLIENT_IMPRESSION_OPTIONS: ReadonlyArray<{
  kind: ClientImpressionKind;
  icon: LucideIcon;
  label: string;
  customerLabel: string;
}> = [
  { kind: "polite", icon: Smile, label: "Hushmuomala", customerLabel: "Hushmuomala" },
  { kind: "great", icon: ThumbsUp, label: "Yaxshi ishladi", customerLabel: "Ajoyib sessiya" },
  { kind: "punctual", icon: Clock3, label: "Vaqtida keldi", customerLabel: "Vaqtida keldingiz" },
  { kind: "friendly", icon: Heart, label: "Yoqimli", customerLabel: "Yoqimli mijoz" },
  { kind: "vip", icon: Star, label: "Ajoyib mijoz", customerLabel: "VIP mijoz" },
];

export function resolveBookingImpressions(kinds: string[] | undefined | null) {
  if (!kinds?.length) return [];
  const set = new Set(kinds);
  return CLIENT_IMPRESSION_OPTIONS.filter((opt) => set.has(opt.kind));
}
