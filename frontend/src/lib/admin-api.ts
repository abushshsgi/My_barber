import { apiFetch, apiJson } from "./api";

export type AdminStats = {
  users_total: number;
  users_clients: number;
  barbers_total: number;
  salons_published: number;
  salons_pending_review: number;
  barber_applications_pending: number;
  bookings_today: number;
  bookings_total: number;
};

export type AdminUserRow = {
  id: number;
  email: string;
  username: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
};

export type AdminSalonRow = {
  id: number;
  name: string;
  slug: string;
  owner: number;
  owner_email: string;
  owner_name: string;
  address: string;
  is_published: boolean;
  premium: boolean;
  latitude: string;
  longitude: string;
  created_at: string;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiJson<AdminStats>("/api/v1/admin/stats/");
}

export async function fetchAdminUsers(params?: { role?: string; q?: string }): Promise<{
  results: AdminUserRow[];
  count?: number;
}> {
  const sp = new URLSearchParams();
  if (params?.role) sp.set("role", params.role);
  if (params?.q) sp.set("q", params.q);
  const q = sp.toString();
  const res = await apiFetch(q ? `/api/v1/admin/users/?${q}` : "/api/v1/admin/users/");
  const j = await res.json();
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  return Array.isArray(j) ? { results: j } : { results: j.results || [], count: j.count };
}

export async function fetchAdminSalons(params?: { published?: "0" | "1"; q?: string }) {
  const sp = new URLSearchParams();
  if (params?.published) sp.set("published", params.published);
  if (params?.q) sp.set("q", params.q);
  const q = sp.toString();
  const res = await apiFetch(q ? `/api/v1/admin/salons/?${q}` : "/api/v1/admin/salons/");
  const j = await res.json();
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  return Array.isArray(j) ? { results: j as AdminSalonRow[] } : { results: (j.results || []) as AdminSalonRow[], count: j.count };
}

export async function patchAdminSalon(id: number, body: Partial<{ is_published: boolean; premium: boolean; name: string }>) {
  return apiJson<AdminSalonRow>(`/api/v1/admin/salons/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function patchAdminUser(id: number, body: Partial<{ role: string; is_active: boolean; full_name: string; phone: string }>) {
  return apiJson(`/api/v1/admin/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type AdminBookingRow = {
  id: number;
  salon_name?: string;
  customer_name?: string;
  start_at: string;
  status: string;
  total_price: string;
};

export async function fetchAdminBookings(): Promise<AdminBookingRow[]> {
  const res = await apiFetch("/api/v1/admin/bookings/");
  const j = await res.json();
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  return Array.isArray(j) ? j : j.results || [];
}
