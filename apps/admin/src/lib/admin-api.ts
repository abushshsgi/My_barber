/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiFetch, apiJson } from "./api";

export const PAGE_SIZE = 50;

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

// --- Types used by UI ---
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

/** Admin barbers ro‘yxati / segment filtri (backend `segment` query bilan mos). */
export type AdminBarberAccountSegment =
  | "independent"
  | "mybarber_salon"
  | "salon_owner"
  | "salon_employee"
  | "unknown";

export type AdminBarberSegmentStats = {
  total: number;
  independent: number;
  mybarber_salon: number;
  salon_owner: number;
  salon_employee: number;
  unknown: number;
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
  account_segment: AdminBarberAccountSegment;
  account_segment_label: string;
};

export type AdminBarberSignupSnapshot = {
  has_salon: boolean;
  shop_name: string;
  age: number | null;
  address: string;
  staff_count_at_signup: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
};

export type AdminBarberMembership = {
  id: number;
  salon_id: number;
  salon_name: string;
  role: string;
  invite_state: string;
  owner_approved: boolean;
  experience_years: number | null;
  activated_at: string | null;
  invited_at: string | null;
};

export type AdminBarberOwnedSalon = {
  id: number;
  name: string;
  slug: string;
  address: string;
  phone: string;
  is_published: boolean;
  latitude: string;
  longitude: string;
};

export type AdminBarberBookingsSummary = {
  total: number;
  by_status: Record<string, number>;
  revenue_completed_uzs: string;
};

export type AdminBarberRecentBooking = {
  id: number;
  customer_name: string;
  customer_phone: string;
  salon_name: string;
  start_at: string;
  status: string;
  total_price: string;
  services_preview: string;
  created_at: string;
};

export type AdminBarberRecentReview = {
  id: number;
  rating: number;
  text: string;
  author_email: string;
  barber_reply: string;
  barber_replied_at: string | null;
  created_at: string;
};

export type AdminBarberSalonService = {
  id: number;
  salon_id: number;
  salon_name: string;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
  barber_id: number | null;
};

export type AdminBarberIndependentService = {
  id: number;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
};

export type AdminBarberDetail = AdminBarber & {
  email: string;
  username: string;
  region_label: string;
  owned_salons_count: number;
  work_mode: string;
  onboarding_flow: string;
  onboarding_completed_at: string | null;
  last_login: string | null;
  signup_snapshot: AdminBarberSignupSnapshot | null;
  location_text: string;
  spoken_languages: string[];
  memberships: AdminBarberMembership[];
  salon_services: AdminBarberSalonService[];
  independent_services: AdminBarberIndependentService[];
  owned_salons: AdminBarberOwnedSalon[];
  bookings_summary: AdminBarberBookingsSummary;
  recent_bookings: AdminBarberRecentBooking[];
  recent_reviews: AdminBarberRecentReview[];
};

export type AdminSalonHour = {
  weekday: number;
  open_time: string;
  close_time: string;
};

export type AdminSalonStaffRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  invite_state: string;
};

export type AdminSalon = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  region: RegionCode;
  published: boolean;
  premium: boolean;
  barbers_count: number;
  reviews_count: number;
  rating: number;
  lat: number;
  lng: number;
  created_at: string;
  owner_barber_id: string | null;
  owner_email: string;
  owner_name: string;
};

export type AdminSalonDetail = AdminSalon & {
  closed_weekdays: number[];
  hours: AdminSalonHour[];
  schedule_summary: string;
  staff_barbers: AdminSalonStaffRow[];
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
  bookings_count?: number;
};

type BackendBarberSignupSnapshot = {
  has_salon?: boolean;
  shop_name?: string;
  age?: number | null;
  address?: string;
  staff_count_at_signup?: number | null;
  raw_payload?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

type BackendBarberMembership = {
  id: number;
  salon_id: number;
  salon_name?: string;
  role: string;
  invite_state: string;
  owner_approved?: boolean;
  experience_years?: number | null;
  activated_at?: string | null;
  invited_at?: string | null;
};

type BackendBarberOwnedSalon = {
  id: number;
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  is_published?: boolean;
  latitude?: string;
  longitude?: string;
};

type BackendBarberBookingsSummary = {
  total?: number;
  by_status?: Record<string, number>;
  revenue_completed_uzs?: string;
};

type BackendBarberRecentBooking = {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  salon_name?: string;
  start_at: string;
  status: string;
  total_price?: string;
  services_preview?: string;
  created_at: string;
};

type BackendBarberRecentReview = {
  id: number;
  rating: number;
  text?: string;
  author_email?: string;
  barber_reply?: string;
  barber_replied_at?: string | null;
  created_at: string;
};

type BackendBarberSalonService = {
  id: number;
  salon_id: number;
  salon_name?: string;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
  barber_id?: number | null;
};

type BackendBarberIndependentService = {
  id: number;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
};

type BackendBarberRow = {
  id: number;
  email: string;
  username?: string;
  full_name: string;
  phone: string | null;
  region: string;
  region_label?: string;
  latitude?: string;
  longitude?: string;
  is_active: boolean;
  date_joined: string;
  owned_salons_count?: number;
  salon_id?: number | null;
  salon_name?: string | null;
  reviews_count?: number;
  rating?: number;
  avatar?: string | null;
  work_mode?: string;
  onboarding_flow?: string;
  onboarding_completed_at?: string | null;
  account_segment?: string;
  account_segment_label?: string;
  signup_snapshot?: BackendBarberSignupSnapshot | null;
  last_login?: string | null;
  location_text?: string;
  spoken_languages?: string[];
  memberships?: BackendBarberMembership[];
  salon_services?: BackendBarberSalonService[];
  independent_services?: BackendBarberIndependentService[];
  owned_salons?: BackendBarberOwnedSalon[];
  bookings_summary?: BackendBarberBookingsSummary;
  recent_bookings?: BackendBarberRecentBooking[];
  recent_reviews?: BackendBarberRecentReview[];
};

type BackendSalonStaffRow = {
  id: number;
  full_name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  invite_state?: string;
};

type BackendSalonRow = {
  id: number;
  name: string;
  slug?: string;
  address: string;
  phone?: string;
  region?: string;
  region_label?: string;
  owner_barber?: number | null;
  owner_email?: string;
  owner_name?: string;
  is_published: boolean;
  premium?: boolean;
  latitude: string;
  longitude: string;
  created_at: string;
  closed_weekdays?: number[];
  hours?: Array<{ weekday: number; open_time: string; close_time: string }>;
  schedule_summary?: string;
  reviews_count?: number;
  rating?: number;
  barbers_count?: number;
  staff_barbers?: BackendSalonStaffRow[];
};

type BackendBookingRow = {
  id: number;
  salon_name?: string;
  customer_name?: string;
  barber_name?: string;
  start_at: string;
  status: string;
  total_price: string;
  lines?: Array<{ service_name?: string }>;
};

type BackendReviewRow = {
  id: number;
  booking: number;
  rating: number;
  text: string;
  created_at: string;
  author_email: string;
  barber_email: string;
  barber_id?: number;
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
    bookings_count: toInt(u.bookings_count, 0),
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

const ADMIN_BARBER_SEGMENTS: readonly AdminBarberAccountSegment[] = [
  "independent",
  "mybarber_salon",
  "salon_owner",
  "salon_employee",
  "unknown",
] as const;

function mapAccountSegment(raw: string | undefined): AdminBarberAccountSegment {
  const v = (raw || "").trim();
  return ADMIN_BARBER_SEGMENTS.includes(v as AdminBarberAccountSegment)
    ? (v as AdminBarberAccountSegment)
    : "unknown";
}

function mapBarber(b: BackendBarberRow): AdminBarber {
  const coord = parseCoord(b.latitude, b.longitude);
  const account_segment = mapAccountSegment(b.account_segment);
  return {
    id: String(b.id),
    name: b.full_name || b.email,
    avatar: b.avatar || avatarFor(String(b.id)),
    phone: b.phone ?? "—",
    region: b.region,
    salon_id: b.salon_id != null ? String(b.salon_id) : null,
    salon_name: b.salon_name ?? null,
    rating: Number(b.rating || 0),
    reviews_count: Number(b.reviews_count || 0),
    is_active: !!b.is_active,
    lat: coord?.lat ?? Number.NaN,
    lng: coord?.lng ?? Number.NaN,
    created_at: b.date_joined,
    account_segment,
    account_segment_label:
      (b.account_segment_label && String(b.account_segment_label).trim()) ||
      account_segment,
  };
}

function mapSignupSnap(
  s: BackendBarberSignupSnapshot | null | undefined,
): AdminBarberSignupSnapshot | null {
  if (!s) return null;
  return {
    has_salon: !!s.has_salon,
    shop_name: s.shop_name ?? "",
    age: s.age ?? null,
    address: s.address ?? "",
    staff_count_at_signup: s.staff_count_at_signup ?? null,
    raw_payload: s.raw_payload && typeof s.raw_payload === "object" ? s.raw_payload : {},
    created_at: s.created_at ?? null,
    updated_at: s.updated_at ?? null,
  };
}

function mapBarberDetail(b: BackendBarberRow): AdminBarberDetail {
  const base = mapBarber(b);
  return {
    ...base,
    email: b.email,
    username: (b.username ?? b.email).trim(),
    region_label: b.region_label ?? "",
    owned_salons_count: toInt(b.owned_salons_count, 0),
    work_mode: b.work_mode ?? "",
    onboarding_flow: b.onboarding_flow ?? "",
    onboarding_completed_at: b.onboarding_completed_at ?? null,
    last_login: b.last_login ?? null,
    signup_snapshot: mapSignupSnap(b.signup_snapshot),
    location_text: b.location_text ?? "",
    spoken_languages: Array.isArray(b.spoken_languages) ? [...b.spoken_languages] : [],
    memberships: (b.memberships ?? []).map((m) => ({
      id: m.id,
      salon_id: m.salon_id,
      salon_name: m.salon_name ?? "",
      role: m.role,
      invite_state: m.invite_state,
      owner_approved: !!m.owner_approved,
      experience_years: m.experience_years ?? null,
      activated_at: m.activated_at ?? null,
      invited_at: m.invited_at ?? null,
    })),
    salon_services: (b.salon_services ?? []).map((s) => ({
      id: s.id,
      salon_id: s.salon_id,
      salon_name: s.salon_name ?? "",
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: !!s.is_active,
      barber_id: s.barber_id ?? null,
    })),
    independent_services: (b.independent_services ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration_minutes: s.duration_minutes,
      is_active: !!s.is_active,
    })),
    owned_salons: (b.owned_salons ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug ?? "",
      address: s.address ?? "",
      phone: s.phone ?? "",
      is_published: !!s.is_published,
      latitude: s.latitude ?? "",
      longitude: s.longitude ?? "",
    })),
    bookings_summary: {
      total: toInt(b.bookings_summary?.total, 0),
      by_status: { ...(b.bookings_summary?.by_status ?? {}) },
      revenue_completed_uzs: b.bookings_summary?.revenue_completed_uzs ?? "0",
    },
    recent_bookings: (b.recent_bookings ?? []).map((bk) => ({
      id: bk.id,
      customer_name: bk.customer_name ?? "—",
      customer_phone: bk.customer_phone ?? "",
      salon_name: bk.salon_name ?? "—",
      start_at: bk.start_at,
      status: bk.status,
      total_price: bk.total_price ?? "0",
      services_preview: bk.services_preview ?? "—",
      created_at: bk.created_at,
    })),
    recent_reviews: (b.recent_reviews ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text ?? "",
      author_email: r.author_email ?? "",
      barber_reply: r.barber_reply ?? "",
      barber_replied_at: r.barber_replied_at ?? null,
      created_at: r.created_at,
    })),
  };
}

function mapSalon(s: BackendSalonRow): AdminSalon {
  const coord = parseCoord(s.latitude, s.longitude);
  return {
    id: String(s.id),
    name: s.name,
    slug: s.slug ?? "",
    address: s.address,
    phone: s.phone ?? "",
    region: s.region ?? "",
    published: !!s.is_published,
    premium: !!s.premium,
    barbers_count: toInt(s.barbers_count, 0),
    reviews_count: toInt(s.reviews_count, 0),
    rating: Number(s.rating ?? 0),
    lat: coord?.lat ?? Number.NaN,
    lng: coord?.lng ?? Number.NaN,
    created_at: s.created_at,
    owner_barber_id: s.owner_barber != null ? String(s.owner_barber) : null,
    owner_email: s.owner_email ?? "",
    owner_name: s.owner_name ?? "",
  };
}

function mapSalonDetail(s: BackendSalonRow): AdminSalonDetail {
  const base = mapSalon(s);
  const hours = Array.isArray(s.hours)
    ? s.hours.map((h) => ({
        weekday: toInt(h.weekday, 0),
        open_time: String(h.open_time ?? ""),
        close_time: String(h.close_time ?? ""),
      }))
    : [];
  const closed = Array.isArray(s.closed_weekdays)
    ? s.closed_weekdays.map((w) => toInt(w, 0))
    : [];
  const staff = (s.staff_barbers ?? []).map((b) => ({
    id: String(b.id),
    full_name: b.full_name ?? "",
    email: b.email ?? "",
    phone: b.phone ?? "",
    role: b.role ?? "",
    invite_state: b.invite_state ?? "",
  }));
  return {
    ...base,
    closed_weekdays: closed,
    hours,
    schedule_summary: s.schedule_summary ?? "",
    staff_barbers: staff,
  };
}

// --- API functions ---
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
  const pageSize = Array.isArray(j)
    ? PAGE_SIZE
    : toInt((j as { page_size?: unknown }).page_size, PAGE_SIZE);
  return {
    results: results.map(mapUser),
    count,
    page,
    page_size: pageSize,
    total_pages: totalPages(count, pageSize),
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

export async function fetchAdminBarberSegmentStats(): Promise<AdminBarberSegmentStats> {
  return apiJson<AdminBarberSegmentStats>("/api/v1/admin/barbers/segment-stats/");
}

export async function fetchAdminBarbers(params?: {
  q?: string;
  region?: RegionCode | "";
  page?: number;
  segment?: AdminBarberAccountSegment | "";
}): Promise<Paginated<AdminBarber>> {
  const page = params?.page ?? 1;
  const res = await apiFetch(
    (() => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.region) sp.set("region", params.region);
      if (params?.segment) sp.set("segment", params.segment);
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
  const pageSize = Array.isArray(j)
    ? PAGE_SIZE
    : toInt((j as { page_size?: unknown }).page_size, PAGE_SIZE);
  return {
    results: results.map(mapBarber),
    count,
    page,
    page_size: pageSize,
    total_pages: totalPages(count, pageSize),
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

export async function fetchAdminBarberDetail(id: string): Promise<AdminBarberDetail> {
  const row = await apiJson<BackendBarberRow>(`/api/v1/admin/barbers/${id}/`);
  return mapBarberDetail(row);
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
  const pageSize = Array.isArray(j)
    ? PAGE_SIZE
    : toInt((j as { page_size?: unknown }).page_size, PAGE_SIZE);
  return {
    results: results.map(mapSalon),
    count,
    page,
    page_size: pageSize,
    total_pages: totalPages(count, pageSize),
  };
}

export async function fetchAdminSalonDetail(id: string): Promise<AdminSalonDetail> {
  const row = await apiJson<BackendSalonRow>(`/api/v1/admin/salons/${id}/`);
  return mapSalonDetail(row);
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

function mapAdminBookingRow(b: BackendBookingRow): AdminBooking {
  return {
    id: String(b.id),
    client_name: b.customer_name ?? "—",
    client_avatar: avatarFor(`c${b.id}`),
    barber_name: b.barber_name ?? "—",
    salon_name: b.salon_name ?? "—",
    service: b.lines?.[0]?.service_name ?? "—",
    price: Math.max(0, toInt(b.total_price, 0)),
    start_at: b.start_at,
    status: b.status,
    region: "",
  };
}

export async function fetchAdminBookings(params?: {
  status?: string;
  barber?: string;
  page?: number;
}): Promise<Paginated<AdminBooking>> {
  const page = params?.page ?? 1;
  const sp = new URLSearchParams();
  if (params?.status && params.status !== "all") sp.set("status", params.status);
  if (params?.barber?.trim()) sp.set("barber", params.barber.trim());
  sp.set("page", String(page));
  const res = await apiFetch(`/api/v1/admin/bookings/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendBookingRow[]; count?: number; page_size?: number }
    | BackendBookingRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j.results ?? []);
  const count = Array.isArray(j) ? rows.length : toInt(j.count, rows.length);
  const pageSize = Array.isArray(j)
    ? PAGE_SIZE
    : toInt((j as { page_size?: unknown }).page_size, PAGE_SIZE);
  return {
    results: rows.map(mapAdminBookingRow),
    count,
    page,
    page_size: pageSize,
    total_pages: totalPages(count, pageSize),
  };
}

export async function fetchAdminReviews(params?: {
  barber?: string;
  min_rating?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
}): Promise<Paginated<AdminReview>> {
  const page = params?.page ?? 1;
  const sp = new URLSearchParams();
  if (params?.barber?.trim()) sp.set("barber", params.barber.trim());
  if ((params?.min_rating ?? 0) > 0) sp.set("min_rating", String(params?.min_rating));
  if (params?.date_from) sp.set("date_from", params.date_from);
  if (params?.date_to) sp.set("date_to", params.date_to);
  sp.set("page", String(page));
  const res = await apiFetch(`/api/v1/admin/reviews/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as
    | { results?: BackendReviewRow[]; count?: number; page_size?: number }
    | BackendReviewRow[];
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j.results ?? []);
  const count = Array.isArray(j) ? rows.length : toInt(j.count, rows.length);
  const pageSize = Array.isArray(j)
    ? PAGE_SIZE
    : toInt((j as { page_size?: unknown }).page_size, PAGE_SIZE);
  return {
    results: rows.map((r) => ({
      id: String(r.id),
      client_name: r.author_email,
      barber_id: String(r.barber_id ?? ""),
      barber_name: r.barber_email,
      rating: r.rating,
      comment: r.text,
      created_at: r.created_at,
    })),
    count,
    page,
    page_size: pageSize,
    total_pages: totalPages(count, pageSize),
  };
}

export async function fetchAllSalonsForMap(region?: RegionCode | ""): Promise<AdminSalon[]> {
  const all: AdminSalon[] = [];
  let page = 1;
  while (true) {
    const chunk = await fetchAdminSalons({ region, page });
    all.push(...chunk.results);
    if (page >= chunk.total_pages) break;
    page += 1;
  }
  return all;
}

export async function fetchAllBarbersForMap(region?: RegionCode | ""): Promise<AdminBarber[]> {
  const all: AdminBarber[] = [];
  let page = 1;
  while (true) {
    const chunk = await fetchAdminBarbers({ region, page });
    all.push(...chunk.results);
    if (page >= chunk.total_pages) break;
    page += 1;
  }
  return all;
}

// -------------------------
// Extra admin sections
// -------------------------

export type ServiceCategory = {
  id: string;
  name: string;
  icon: string;
  order: number;
  services_count: number;
};

export type AdminService = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  category_ids: string[];
  category_names: string[];
  linked_rows_count: number;
};

export type AdminServiceAssignment = {
  id: string;
  type: "salon" | "independent";
  catalog_service_id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  salon_id: string;
  salon_name: string;
  barber_id: string;
  barber_name: string;
  bookings_total: number;
  bookings_completed: number;
  bookings_cancelled: number;
};

export type AdminServiceUsage = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  is_active: boolean;
  category_names: string[];
  barbers_count: number;
  bookings_total: number;
  bookings_completed: number;
  bookings_cancelled: number;
  cancellation_rate: number;
  rows: AdminServiceAssignment[];
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

export async function fetchServices(params?: {
  q?: string;
  category?: string;
}): Promise<AdminService[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category && params.category !== "all") sp.set("category", params.category);
  const res = await apiFetch(`/api/v1/admin/services/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j as { results?: unknown[] }).results || [];
  return (rows as any[]).map((s) => ({
    id: String(s.id),
    name: String(s.name || ""),
    slug: String(s.slug || ""),
    description: String(s.description || ""),
    image_url: String(s.image_url || ""),
    duration_minutes: Number(s.duration_minutes || 0),
    is_active: !!s.is_active,
    sort_order: Number(s.sort_order || 0),
    category_ids: Array.isArray(s.category_ids) ? s.category_ids.map((x: any) => String(x)) : [],
    category_names: Array.isArray(s.category_names) ? s.category_names.map((x: any) => String(x)) : [],
    linked_rows_count: Number(s.linked_rows_count || 0),
  }));
}

export async function createService(body: {
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  category_ids: string[];
}): Promise<AdminService> {
  const res = await apiFetch("/api/v1/admin/services/", {
    method: "POST",
    body: JSON.stringify({
      ...body,
      category_ids: body.category_ids.map((x) => Number(x)),
    }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  return {
    id: String(j.id),
    name: String(j.name || ""),
    slug: String(j.slug || ""),
    description: String(j.description || ""),
    image_url: String(j.image_url || ""),
    duration_minutes: Number(j.duration_minutes || 0),
    is_active: !!j.is_active,
    sort_order: Number(j.sort_order || 0),
    category_ids: Array.isArray(j.category_ids) ? j.category_ids.map((x: any) => String(x)) : [],
    category_names: Array.isArray(j.category_names) ? j.category_names.map((x: any) => String(x)) : [],
    linked_rows_count: Number(j.linked_rows_count || 0),
  };
}

export async function updateService(
  id: string,
  body: Partial<
    Pick<
      AdminService,
      "name" | "description" | "image_url" | "duration_minutes" | "is_active" | "sort_order" | "category_ids"
    >
  >,
): Promise<AdminService> {
  const res = await apiFetch(`/api/v1/admin/services/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      ...body,
      category_ids: body.category_ids ? body.category_ids.map((x) => Number(x)) : undefined,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  return {
    id: String(j.id),
    name: String(j.name || ""),
    slug: String(j.slug || ""),
    description: String(j.description || ""),
    image_url: String(j.image_url || ""),
    duration_minutes: Number(j.duration_minutes || 0),
    is_active: !!j.is_active,
    sort_order: Number(j.sort_order || 0),
    category_ids: Array.isArray(j.category_ids) ? j.category_ids.map((x: any) => String(x)) : [],
    category_names: Array.isArray(j.category_names) ? j.category_names.map((x: any) => String(x)) : [],
    linked_rows_count: Number(j.linked_rows_count || 0),
  };
}

export async function deleteService(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/services/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "Xizmat o‘chirilmadi");
  }
}

export async function fetchServiceUsage(params?: {
  q?: string;
  category?: string;
}): Promise<AdminServiceUsage[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category && params.category !== "all") sp.set("category", params.category);
  const res = await apiFetch(`/api/v1/admin/services/usage/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((s: any) => ({
    id: String(s.id),
    name: String(s.name || ""),
    description: String(s.description || ""),
    image_url: String(s.image_url || ""),
    duration_minutes: Number(s.duration_minutes || 0),
    is_active: !!s.is_active,
    category_names: Array.isArray(s.category_names) ? s.category_names.map((x: any) => String(x)) : [],
    barbers_count: Number(s.barbers_count || 0),
    bookings_total: Number(s.bookings_total || 0),
    bookings_completed: Number(s.bookings_completed || 0),
    bookings_cancelled: Number(s.bookings_cancelled || 0),
    cancellation_rate: Number(s.cancellation_rate || 0),
    rows: Array.isArray(s.rows)
      ? s.rows.map((row: any) => ({
          id: String(row.id),
          type: row.type === "independent" ? "independent" : "salon",
          catalog_service_id: String(row.catalog_service_id || ""),
          service_name: String(row.service_name || ""),
          price: Number(row.price || 0),
          duration_minutes: Number(row.duration_minutes || 0),
          is_active: !!row.is_active,
          salon_id: String(row.salon_id ?? ""),
          salon_name: String(row.salon_name ?? ""),
          barber_id: String(row.barber_id ?? ""),
          barber_name: String(row.barber_name ?? ""),
          bookings_total: Number(row.bookings_total || 0),
          bookings_completed: Number(row.bookings_completed || 0),
          bookings_cancelled: Number(row.bookings_cancelled || 0),
        }))
      : [],
  }));
}

export async function updateServiceAssignment(
  kind: "salon" | "independent",
  id: string,
  body: {
    price?: number;
    is_active?: boolean;
  },
): Promise<{ ok: true }> {
  const res = await apiFetch(`/api/v1/admin/service-assignments/${kind}/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  const j = (await res.json().catch(() => ({}))) as { detail?: string };
  if (!res.ok) throw new Error(j.detail || "Xato");
  return { ok: true as const };
}

export async function deleteServiceAssignment(
  kind: "salon" | "independent",
  id: string,
): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/service-assignments/${kind}/${id}/`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "Biriktirilgan xizmat o‘chirilmadi");
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
  admin_avatar: string;
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
    admin_avatar: avatarFor(String(a.admin || a.id || "admin")),
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
  if (params?.status && params.status !== "all") sp.set("status", params.status);
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
  return apiJson(`/api/v1/admin/support/tickets/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function postTicketReply(id: string, body: string): Promise<any> {
  return apiJson(`/api/v1/admin/support/tickets/${id}/replies/`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export type AdminBroadcast = {
  id: string;
  audience: string;
  region?: string;
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
    region: b.region ? String(b.region) : undefined,
    channel: String(b.channel || ""),
    title: String(b.title || ""),
    body: String(b.body || ""),
    sent_count: Number(b.sent_count || 0),
    read_count: Number(b.read_count || 0),
    created_at: String(b.created_at || ""),
  }));
}

export async function createBroadcast(
  body: Omit<AdminBroadcast, "id" | "sent_count" | "read_count" | "created_at">,
): Promise<AdminBroadcast> {
  return apiJson<AdminBroadcast>("/api/v1/admin/broadcast/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type PlatformAdmin = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string;
  avatar: string;
};

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

export async function updateAdmin(
  id: string,
  body: Partial<PlatformAdmin>,
): Promise<PlatformAdmin> {
  return apiJson<PlatformAdmin>(`/api/v1/admin/admins/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export type AdminProfile = { id: string; email: string; role: string };

export async function fetchAdminProfile(): Promise<AdminProfile> {
  return apiJson<AdminProfile>("/api/v1/admin/auth/me/");
}

export async function downloadAdminReport(type: "stats" | "finance"): Promise<{ ok: true }> {
  const res = await apiFetch(`/api/v1/admin/reports/${type}/`);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(j.detail || "Hisobot olinmadi");
  }
  return { ok: true };
}
