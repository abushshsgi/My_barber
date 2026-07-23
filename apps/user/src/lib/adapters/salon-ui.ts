import type { Salon as SharedSalon } from "@mybarber/shared/types";
import type { Salon as AppSalon } from "@/lib/mock-data";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";

/** apps/user Salon → @mybarber/user-ui SalonCardPremium uchun. */
export function toUiSalon(salon: AppSalon): SharedSalon {
  const coverImage = salon.coverUrl?.trim() || PLACEHOLDER_SALON;
  const gallery = [coverImage, ...salon.portfolio]
    .map((u) => u?.trim())
    .filter((u): u is string => Boolean(u) && u !== PLACEHOLDER_SALON)
    .filter((u, i, arr) => arr.indexOf(u) === i);
  return {
    id: salon.id,
    name: salon.name,
    description: salon.about,
    coverImage,
    gallery: gallery.length > 0 ? gallery : coverImage !== PLACEHOLDER_SALON ? [coverImage] : [],
    rating: salon.rating,
    reviewCount: salon.reviewCount,
    distance: salon.distanceKm,
    lat: salon.lat,
    lng: salon.lng,
    city: salon.address.split(",")[0]?.trim() ?? "",
    address: salon.address,
    phone: "",
    languages: [],
    isPremium: salon.rating >= 4.8,
    workingDays: [],
    workingHours: { open: "09:00", close: "21:00" },
    barbers: salon.staff.map((b) => ({
      id: b.id,
      name: b.name,
      avatar: b.avatarUrl ?? "",
      rating: b.rating,
      experience: 0,
      specialties: [b.role],
      salonId: salon.id,
      isOwner: false,
    })),
    services: salon.services.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      salonId: salon.id,
    })),
    reviews: salon.reviews.map((r) => ({
      id: r.id,
      userId: r.id,
      userName: r.author,
      userAvatar: "",
      rating: r.rating,
      comment: r.text,
      photo: r.photo,
      createdAt: r.date,
      salonId: salon.id,
    })),
  };
}

export function toUiSalons(salons: AppSalon[]): SharedSalon[] {
  return salons.map(toUiSalon);
}
