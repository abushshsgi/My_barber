import { AdminMap2GIS as BaseAdminMap2GIS, type AdminMapPoint } from "@mybarber/map-google";
import type { AdminBarber, AdminSalon } from "@/lib/admin-api";

function toSalonPoint(s: AdminSalon): AdminMapPoint {
  return {
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    label: s.name,
    subtitle: s.address,
    kind: "salon",
  };
}

function toBarberPoint(b: AdminBarber): AdminMapPoint {
  return {
    id: b.id,
    lat: b.lat,
    lng: b.lng,
    label: b.name,
    subtitle: b.salon_name ?? "",
    kind: "barber",
  };
}

export default function AdminMap2GIS({
  salons,
  barbers,
}: {
  salons: AdminSalon[];
  barbers: AdminBarber[];
}) {
  return (
    <BaseAdminMap2GIS
      salons={salons.map(toSalonPoint)}
      barbers={barbers.map(toBarberPoint)}
      style={{ minHeight: 480 }}
    />
  );
}
