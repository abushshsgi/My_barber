import { API_BASE } from "@/lib/api";
import type { ApiBarberService } from "@/hooks/use-barber-queries";
import type { PendingCatalogService, ServiceForm } from "./types";

export const FALLBACK_SERVICE_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 520'%3E%3Crect width='800' height='520' rx='36' fill='%23111827'/%3E%3Ccircle cx='620' cy='120' r='120' fill='%232563eb' fill-opacity='0.25'/%3E%3Ccircle cx='700' cy='410' r='100' fill='%23ec4899' fill-opacity='0.18'/%3E%3Ctext x='72' y='274' font-family='Arial,sans-serif' font-size='56' font-weight='700' fill='white'%3EXizmat%3C/text%3E%3Ctext x='72' y='328' font-family='Arial,sans-serif' font-size='24' fill='rgba(255,255,255,0.8)'%3EMyBarber katalog%3C/text%3E%3C/svg%3E";

export function serviceImageSrc(path?: string | null): string {
  const value = String(path || "").trim();
  if (!value) return FALLBACK_SERVICE_IMAGE;
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE}${normalized}`;
}

export function mapService(row: ApiBarberService): ServiceForm {
  return {
    id: String(row.id),
    barber: row.barber ?? null,
    catalog_service: row.catalog_service ? String(row.catalog_service) : "",
    name: row.name,
    image_url: row.image_url || "",
    price: String(Number(row.price)),
    duration_minutes: String(row.duration_minutes),
    is_active: Boolean(row.is_active),
  };
}

export function serializeForm(
  services: ServiceForm[],
  pendingServices: PendingCatalogService[],
): string {
  return JSON.stringify({
    services: services.map((s) => ({
      id: s.id,
      barber: s.barber ?? null,
      catalog_service: s.catalog_service ?? "",
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: s.is_active,
    })),
    pendingServices: pendingServices.map((service) => ({
      catalog_service: service.catalog_service,
      price: service.price,
      is_active: service.is_active,
    })),
  });
}
