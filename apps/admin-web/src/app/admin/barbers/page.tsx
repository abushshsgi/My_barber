import { AdminUserManagement } from "@/page-views/admin/AdminUserManagement";

export default function AdminBarbersPage() {
  return (
    <AdminUserManagement
      variant="barbers"
      title="Sartaroshlar"
      description="Salon egalari va xodimlar (BARBER_OWNER, BARBER_STAFF). Barcha maydonlar admin API orqali."
    />
  );
}
