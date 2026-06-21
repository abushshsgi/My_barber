import {
  Accessibility,
  AirVent,
  Baby,
  CalendarCheck,
  Car,
  Coffee,
  CreditCard,
  DoorClosed,
  Gem,
  Gift,
  Music,
  Sofa,
  Sparkles,
  Tv,
  Wifi,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  wifi: Wifi,
  car: Car,
  "credit-card": CreditCard,
  "air-vent": AirVent,
  sofa: Sofa,
  coffee: Coffee,
  "calendar-check": CalendarCheck,
  sparkles: Sparkles,
  gem: Gem,
  baby: Baby,
  accessibility: Accessibility,
  tv: Tv,
  music: Music,
  "door-closed": DoorClosed,
  gift: Gift,
};

export function amenityIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Sparkles;
}
