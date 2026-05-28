import type { Salon as VendorSalon } from "@/lib/mock-data";
import type { Salon } from "@mybarber/shared/types";
import { SalonCardPremium } from "@mybarber/user-ui";

function toSalon(s: VendorSalon): Salon {
  return {
    id: String(s.id),
    name: s.name,
    description: s.address || "",
    coverImage: "/placeholder-salon.svg",
    gallery: [],
    rating: Number(s.rating) || 0,
    reviewCount: 0,
    distance: Number(s.distanceKm) || 0,
    lat: 0,
    lng: 0,
    city: "",
    address: s.address || "",
    phone: "",
    languages: [],
    isPremium: false,
    workingDays: [],
    workingHours: { open: "09:00", close: "21:00" },
    barbers: [],
    services: [],
    reviews: [],
  };
}

export function SalonCard({ salon }: { salon: VendorSalon }) {
  return <SalonCardPremium salon={toSalon(salon)} layout="vertical" />;
}
