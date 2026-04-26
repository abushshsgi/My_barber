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
