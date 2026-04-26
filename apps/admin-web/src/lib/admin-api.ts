import { apiFetch, apiJson } from "./api";

export const PAGE_SIZE = 10;

export type Paginated<T> = {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
};

function toInt(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

// --- Types used by UI (kept compatible with admin-hub mock-data.ts) ---
export type RegionCode = string;

export type AdminUser = {
  id: string;
  name: string;
  phone: string;
  email: string;
  region: RegionCode;
  is_active: boolean;
  created_at: string;
  bookings_count: number;
};

export type AdminBarber = {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  region: RegionCode;
  salon_id: string | null;
  salon_name: string | null;
  rating: number;
  reviews_count: number;
  is_active: boolean;
  lat: number;
  lng: number;
  created_at: string;
};

export type AdminSalon = {
  id: string;
  name: string;
  address: string;
  region: RegionCode;
  published: boolean;
  barbers_count: number;
  rating: number;
  lat: number;
  lng: number;
  created_at: string;
};

export type AdminBooking = {
  id: string;
  client_name: string;
  client_avatar: string;
  barber_name: string;
  salon_name: string;
  service: string;
  price: number;
  start_at: string;
  status: string;
  region: RegionCode;
};

export type AdminReview = {
  id: string;
  client_name: string;
  barber_id: string;
  barber_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type AdminStats = {
  total_users: number;
  total_barbers: number;
  total_salons: number;
  total_bookings: number;
  weekly_bookings: number;
  revenue_uzs: number;
  delta: { users: number; barbers: number; bookings: number; revenue: number };
  regions: Array<{
    code: RegionCode;
    name: string;
    barbers: number;
    salons: number;
    users: number;
    bookings: number;
  }>;
};

function avatarFor(seed: string): string {
  const n = Array.from(seed).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 70;
  return `https://i.pravatar.cc/150?img=${n + 1}`;
}

// --- Backend shapes (partial) ---
type BackendUserRow = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  region: string;
  region_label?: string;
  is_active: boolean;
  date_joined: string;
};

type BackendBarberRow = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  region: string;
  region_label?: string;
  latitude?: string;
  longitude?: string;
  is_active: boolean;
  date_joined: string;
  owned_salons_count: number;
};

type BackendSalonRow = {
  id: number;
  name: string;
  address: string;
  region?: string;
  region_label?: string;
  is_published: boolean;
  latitude: string;
  longitude: string;
  created_at: string;
};

type BackendBookingRow = {
  id: number;
  salon_name?: string;
  customer_name?: string;
  start_at: string;
  status: string;
  total_price: string;
};

type BackendReviewRow = {
  id: number;
  booking: number;
  rating: number;
  text: string;
  created_at: string;
  author_email: string;
  barber_email: string;
};

type BackendStats = {
  users_total: number;
  barbers_total: number;
  salons_published: number;
  bookings_total: number;
  bookings_today: number;
  reviews_total: number;
  regions?: Array<{
    region: string;
    label: string;
    barbers_count: number;
    salons_count: number;
  }>;
};

function mapUser(u: BackendUserRow): AdminUser {
  return {
    id: String(u.id),
    name: u.full_name || u.email,
    phone: u.phone ?? "—",
    email: u.email,
    region: u.region,
    is_active: !!u.is_active,
    created_at: u.date_joined,
    bookings_count: 0,
  };
}

function parseCoord(latStr?: string, lngStr?: string): { lat: number; lng: number } | null {
  const lat = parseFloat(latStr ?? "");
  const lng = parseFloat(lngStr ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // Reject 0,0 which we use as "unknown" in some backends.
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function mapBarber(b: BackendBarberRow): AdminBarber {
  const coord = parseCoord(b.latitude, b.longitude);
  return {
    id: String(b.id),
    name: b.full_name || b.email,
    avatar: avatarFor(String(b.id)),
    phone: b.phone ?? "—",
    region: b.region,
    salon_id: null,
    salon_name: null,
    rating: 0,
    reviews_count: 0,
    is_active: !!b.is_active,
    lat: coord?.lat ?? Number.NaN,
    lng: coord?.lng ?? Number.NaN,
    created_at: b.date_joined,
  };
}

function mapSalon(s: BackendSalonRow): AdminSalon {
  const coord = parseCoord(s.latitude, s.longitude);
  return {
    id: String(s.id),
    name: s.name,
    address: s.address,
    region: s.region ?? "",
    published: !!s.is_published,
    barbers_count: 0,
    rating: 0,
    lat: coord?.lat ?? Number.NaN,
    lng: coord?.lng ?? Number.NaN,
    created_at: s.created_at,
  };
}

// --- API functions (compatible with previous mock-api.ts exports) ---
export async function fetchAdminStats(): Promise<AdminStats> {
  const stats = await apiJson<BackendStats>("/api/v1/admin/stats/");
  return {
    total_users: stats.users_total ?? 0,
    total_barbers: stats.barbers_total ?? 0,
    total_salons: stats.salons_published ?? 0,
    total_bookings: stats.bookings_total ?? 0,
    weekly_bookings: stats.bookings_today ?? 0,
    revenue_uzs: 0,
    delta: { users: 0, barbers: 0, bookings: 0, revenue: 0 },
    regions: (stats.regions ?? []).map((r) => ({
      code: r.region,
      name: r.label || r.region,
      barbers: r.barbers_count ?? 0,
      salons: r.salons_count ?? 0,
      users: 0,
      bookings: 0,
    })),
  };
}

export async function fetchAdminUsers(params?: {
  q?: string;
  region?: RegionCode | "";
  page?: number;
}): Promise<Paginated<AdminUser>> {
  const page = params?.page ?? 1;
  const res = await apiFetch(
    (() => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.region) sp.set("region", params.region);
      sp.set("page", String(page));
      return `/api/v1/admin/users/?${sp.toString()}`;
    })(),
  );
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendUserRow[]; count?: number }
    | BackendUserRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const results = Array.isArray(j) ? j : (j.results ?? []);
  const count = Array.isArray(j) ? results.length : toInt(j.count, results.length);
  return {
    results: results.map(mapUser),
    count,
    page,
    page_size: PAGE_SIZE,
    total_pages: totalPages(count, PAGE_SIZE),
  };
}

export async function patchAdminUser(
  id: string,
  body: Partial<{ is_active: boolean; region: string }>,
): Promise<AdminUser> {
  const row = await apiJson<BackendUserRow>(`/api/v1/admin/users/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapUser(row);
}

export async function fetchAdminBarbers(params?: {
  q?: string;
  region?: RegionCode | "";
  page?: number;
}): Promise<Paginated<AdminBarber>> {
  const page = params?.page ?? 1;
  const res = await apiFetch(
    (() => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.region) sp.set("region", params.region);
      sp.set("page", String(page));
      return `/api/v1/admin/barbers/?${sp.toString()}`;
    })(),
  );
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendBarberRow[]; count?: number }
    | BackendBarberRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const results = Array.isArray(j) ? j : (j.results ?? []);
  const count = Array.isArray(j) ? results.length : toInt(j.count, results.length);
  return {
    results: results.map(mapBarber),
    count,
    page,
    page_size: PAGE_SIZE,
    total_pages: totalPages(count, PAGE_SIZE),
  };
}

export async function patchAdminBarber(
  id: string,
  body: Partial<{ full_name: string; phone: string; region: string; is_active: boolean }>,
): Promise<AdminBarber> {
  const row = await apiJson<BackendBarberRow>(`/api/v1/admin/barbers/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapBarber(row);
}

export async function deleteAdminBarber(id: string): Promise<{ ok: true }> {
  const res = await apiFetch(`/api/v1/admin/barbers/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "Sartarosh o‘chirilmadi");
  }
  return { ok: true as const };
}

export async function fetchAdminSalons(params?: {
  q?: string;
  region?: RegionCode | "";
  published?: boolean | "all";
  page?: number;
}): Promise<Paginated<AdminSalon>> {
  const page = params?.page ?? 1;
  const res = await apiFetch(
    (() => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.region) sp.set("region", params.region);
      if (params?.published !== undefined && params.published !== "all") {
        sp.set("published", params.published ? "1" : "0");
      }
      sp.set("page", String(page));
      return `/api/v1/admin/salons/?${sp.toString()}`;
    })(),
  );
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendSalonRow[]; count?: number }
    | BackendSalonRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const results = Array.isArray(j) ? j : (j.results ?? []);
  const count = Array.isArray(j) ? results.length : toInt(j.count, results.length);
  return {
    results: results.map(mapSalon),
    count,
    page,
    page_size: PAGE_SIZE,
    total_pages: totalPages(count, PAGE_SIZE),
  };
}

export async function patchAdminSalon(
  id: string,
  body: Partial<{ published: boolean }>,
): Promise<AdminSalon> {
  const row = await apiJson<BackendSalonRow>(`/api/v1/admin/salons/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ is_published: body.published }),
  });
  return mapSalon(row);
}

export async function deleteAdminSalon(id: string): Promise<{ ok: true }> {
  const res = await apiFetch(`/api/v1/admin/salons/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "Salon o‘chirilmadi");
  }
  return { ok: true as const };
}

export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  const res = await apiFetch("/api/v1/admin/bookings/");
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendBookingRow[] }
    | BackendBookingRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j.results ?? []);
  return rows.map((b) => ({
    id: String(b.id),
    client_name: b.customer_name ?? "—",
    client_avatar: avatarFor(`c${b.id}`),
    barber_name: "—",
    salon_name: b.salon_name ?? "—",
    service: "—",
    price: Math.max(0, toInt(b.total_price, 0)),
    start_at: b.start_at,
    status: b.status,
    region: "",
  }));
}

export async function fetchAdminReviews(): Promise<AdminReview[]> {
  const res = await apiFetch("/api/v1/admin/reviews/");
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendReviewRow[] }
    | BackendReviewRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j.results ?? []);
  return rows.map((r) => ({
    id: String(r.id),
    client_name: r.author_email,
    barber_id: r.barber_email,
    barber_name: r.barber_email,
    rating: r.rating,
    comment: r.text,
    created_at: r.created_at,
  }));
}

export async function fetchAllSalonsForMap(region?: RegionCode | ""): Promise<AdminSalon[]> {
  const sp = new URLSearchParams();
  if (region) sp.set("region", region);
  // Try to fetch everything for map in one request (DRF usually supports page_size).
  sp.set("page_size", "5000");
  const res = await apiFetch(`/api/v1/admin/salons/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendSalonRow[] }
    | BackendSalonRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j.results ?? []);
  return rows.map(mapSalon);
}

export async function fetchAllBarbersForMap(region?: RegionCode | ""): Promise<AdminBarber[]> {
  const sp = new URLSearchParams();
  if (region) sp.set("region", region);
  sp.set("page_size", "5000");
  const res = await apiFetch(`/api/v1/admin/barbers/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendBarberRow[] }
    | BackendBarberRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j.results ?? []);
  return rows.map(mapBarber);
}

// -------------------------
// Extra admin sections (replace mock-api-extra)
// -------------------------

export type ServiceCategory = { id: string; name: string; icon: string; order: number; services_count: number };

export type AdminService = {
  id: string;
  type: "salon" | "independent";
  name: string;
  category_ids: string[];
  category_names: string;
  price: number;
  duration_min: number;
  bookings_count: number;
  is_active: boolean;
};

export async function fetchCategories(): Promise<ServiceCategory[]> {
  const res = await apiFetch("/api/v1/admin/categories/");
  const j = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j as { results?: unknown[] }).results || [];
  return (rows as any[]).map((c) => ({
    id: String(c.id),
    name: String(c.name || ""),
    icon: String(c.icon || ""),
    order: Number(c.order || 0),
    services_count: Number(c.services_count || 0),
  }));
}

export async function fetchServices(params?: { q?: string; category?: string; type?: string }): Promise<AdminService[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category && params.category !== "all") sp.set("category", params.category);
  if (params?.type) sp.set("type", params.type);
  const res = await apiFetch(`/api/v1/admin/services/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  return (j as any[]).map((s) => ({
    id: String(s.id),
    type: (s.type === "independent" ? "independent" : "salon") as "salon" | "independent",
    name: String(s.name || ""),
    category_ids: Array.isArray(s.category_ids) ? s.category_ids.map((x: any) => String(x)) : [],
    category_names: String(s.category_names || ""),
    price: Number(s.price || 0),
    duration_min: Number(s.duration_min || 0),
    bookings_count: Number(s.bookings_count || 0),
    is_active: !!s.is_active,
  }));
}

export async function createService(body: {
  type: "salon" | "independent";
  name: string;
  price: number;
  duration_min: number;
  is_active: boolean;
  category_ids: string[];
  salon_id?: string;
  barber_id?: string;
}): Promise<{ ok: true; id: string }> {
  const res = await apiFetch("/api/v1/admin/services/", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      category_ids: body.category_ids.map((x) => Number(x)),
      salon_id: body.salon_id ? Number(body.salon_id) : undefined,
      barber_id: body.barber_id ? Number(body.barber_id) : undefined,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { id?: string; ok?: boolean; detail?: string };
  if (!res.ok) throw new Error(j.detail || "Xato");
  return { ok: true as const, id: String(j.id || "") };
}

export async function updateService(
  id: string,
  body: Partial<Pick<AdminService, "name" | "price" | "duration_min" | "is_active" | "category_ids">> & {
    type?: "salon" | "independent";
  },
): Promise<{ ok: true }> {
  const sp = new URLSearchParams();
  if (body.type) sp.set("type", body.type);
  const res = await apiFetch(`/api/v1/admin/services/${id}/?${sp.toString()}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...body,
      category_ids: body.category_ids ? body.category_ids.map((x) => Number(x)) : undefined,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) throw new Error(j.detail || "Xato");
  return { ok: true as const };
}

export async function deleteService(id: string, type: "salon" | "independent"): Promise<void> {
  const sp = new URLSearchParams();
  sp.set("type", type);
  const res = await apiFetch(`/api/v1/admin/services/${id}/?${sp.toString()}`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "Xizmat o‘chirilmadi");
  }
}

export type AdminFinanceSummary = {
  revenue_total: number;
  revenue_week: number;
  commission_total: number;
  pending_payouts: number;
  weekly: Array<{ day: string; revenue: number }>;
  top_barbers: Array<{ id: string; name: string; avatar: string; revenue: number }>;
};

export async function fetchFinanceSummary(): Promise<AdminFinanceSummary> {
  return apiJson<AdminFinanceSummary>("/api/v1/admin/finance/overview/");
}

export type AdminTransaction = {
  id: string;
  type: string;
  related_name: string;
  amount: number;
  status: string;
  created_at: string;
};

export async function fetchTransactions(): Promise<AdminTransaction[]> {
  const res = await apiFetch("/api/v1/admin/finance/transactions/");
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((t: any) => ({
    id: String(t.id),
    type: String(t.type || ""),
    related_name: String(t.related_name || ""),
    amount: Number(t.amount || 0),
    status: String(t.status || ""),
    created_at: String(t.created_at || ""),
  }));
}

export type AdminPayout = {
  id: string;
  barber_name: string;
  barber_avatar: string;
  period: string;
  amount: number;
  status: string;
};

export async function fetchPayouts(): Promise<AdminPayout[]> {
  const res = await apiFetch("/api/v1/admin/finance/payouts/");
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((p: any) => ({
    id: String(p.id),
    barber_name: String(p.barber_name || ""),
    barber_avatar: String(p.barber_avatar || ""),
    period: String(p.period || ""),
    amount: Number(p.amount || 0),
    status: String(p.status || ""),
  }));
}

export async function markPayoutPaid(id: string): Promise<{ ok: true }> {
  const res = await apiFetch(`/api/v1/admin/finance/payouts/${id}/paid/`, { method: "POST" });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  return { ok: true as const };
}

export type AdminAuditRow = {
  id: string;
  admin: string;
  action: string;
  target_type: string;
  target_name: string;
  ip: string;
  created_at: string;
};

export async function fetchAuditLog(): Promise<AdminAuditRow[]> {
  const res = await apiFetch("/api/v1/admin/audit/");
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((a: any) => ({
    id: String(a.id),
    admin: String(a.admin || ""),
    action: String(a.action || ""),
    target_type: String(a.target_type || ""),
    target_name: String(a.target_name || ""),
    ip: String(a.ip || ""),
    created_at: String(a.created_at || ""),
  }));
}

export type AdminTicket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  unread: number;
  user_name: string;
  user_avatar: string;
  assignee: string;
  updated_at: string;
};

export async function fetchTickets(params?: { status?: string }): Promise<AdminTicket[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  const res = await apiFetch(`/api/v1/admin/support/tickets/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((t: any) => ({
    id: String(t.id),
    subject: String(t.subject || ""),
    status: String(t.status || ""),
    priority: String(t.priority || ""),
    unread: Number(t.unread || 0),
    user_name: String(t.user_name || ""),
    user_avatar: String(t.user_avatar || ""),
    assignee: String(t.assignee || ""),
    updated_at: String(t.updated_at || ""),
  }));
}

export async function getTicketById(id: string): Promise<any> {
  return apiJson(`/api/v1/admin/support/tickets/${id}/`);
}

export async function getTicketReplies(id: string): Promise<any[]> {
  return apiJson(`/api/v1/admin/support/tickets/${id}/replies/`);
}

export async function updateTicket(id: string, body: any): Promise<any> {
  return apiJson(`/api/v1/admin/support/tickets/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
}

export async function postTicketReply(id: string, body: string): Promise<any> {
  return apiJson(`/api/v1/admin/support/tickets/${id}/replies/`, { method: "POST", body: JSON.stringify({ body }) });
}

export type AdminBroadcast = {
  id: string;
  audience: string;
  channel: string;
  title: string;
  body: string;
  sent_count: number;
  read_count: number;
  created_at: string;
};

export async function fetchBroadcasts(): Promise<AdminBroadcast[]> {
  const res = await apiFetch("/api/v1/admin/broadcast/");
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((b: any) => ({
    id: String(b.id),
    audience: String(b.audience || ""),
    channel: String(b.channel || ""),
    title: String(b.title || ""),
    body: String(b.body || ""),
    sent_count: Number(b.sent_count || 0),
    read_count: Number(b.read_count || 0),
    created_at: String(b.created_at || ""),
  }));
}

export async function createBroadcast(body: Omit<AdminBroadcast, "id" | "sent_count" | "read_count" | "created_at">): Promise<AdminBroadcast> {
  return apiJson<AdminBroadcast>("/api/v1/admin/broadcast/", { method: "POST", body: JSON.stringify(body) });
}

export type PlatformAdmin = { id: string; name: string; email: string; role: string; is_active: boolean; last_login: string; avatar: string };

export async function fetchAdmins(): Promise<PlatformAdmin[]> {
  const res = await apiFetch("/api/v1/admin/admins/");
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((a: any) => ({
    id: String(a.id),
    name: String(a.name || ""),
    email: String(a.email || ""),
    role: String(a.role || "superadmin"),
    is_active: !!a.is_active,
    last_login: String(a.last_login || ""),
    avatar: String(a.avatar || ""),
  }));
}

export async function updateAdmin(id: string, body: Partial<PlatformAdmin>): Promise<PlatformAdmin> {
  return apiJson<PlatformAdmin>(`/api/v1/admin/admins/${id}/`, { method: "PATCH", body: JSON.stringify(body) });
}
