export type SalonSectionId =
  | "about"
  | "amenities"
  | "services"
  | "staff"
  | "reviews"
  | "location"
  | "hours"
  | "portfolio";

export function scrollToSalonSection(id: SalonSectionId) {
  document.getElementById(`salon-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
