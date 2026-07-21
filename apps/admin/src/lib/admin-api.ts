/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiFetch, apiJson } from "./api";
import { resolveMediaUrl } from "./media-url";
import { uzRegionLabel } from "./uz-regions";

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
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  displayEmail: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  region: RegionCode;
  regionLabel: string;
  latitude: string;
  longitude: string;
  locationCity: string;
  birthYear: number | null;
  defaultAddress: string;
  familyMembersCount: number;
  is_active: boolean;
  created_at: string;
  bookings_count: number;
};

export type UserSignupMethod = "google" | "phone" | "email" | "unknown";

export type AdminUserDetail = AdminUser & {
  signupMethod: UserSignupMethod;
  bookingsSummary: {
    total: number;
    byStatus: Record<string, number>;
    spentCompletedUzs: number;
  };
  recentBookings: Array<{
    id: string;
    barberName: string;
    salonName: string;
    region: string;
    regionLabel: string;
    startAt: string;
    status: string;
    totalPrice: number;
    servicesPreview: string;
    customerPhone: string;
  }>;
  bookingRegions: Array<{ region: string; label: string; bookings: number }>;
  morphAi: {
    generations: number;
    tryon: number;
    analyze: number;
    faceCheck: number;
    studio: number;
    success: number;
    failed: number;
    totalTokens: number;
    promptTokens: number;
    candidatesTokens: number;
    costUsd: number;
    lastAt: string | null;
  };
  recentStyles: Array<{
    kind: string;
    styleId: string;
    styleTitle: string;
    status: string;
    createdAt: string;
    source: string;
    totalTokens: number;
    promptTokens: number;
    candidatesTokens: number;
    costUsd: number;
    model: string;
    provider: string;
    latencyMs: number;
    errorDetail: string;
  }>;
  wallet: {
    walletNumber: string;
    balance: number;
    recentEntries: Array<{
      id: string;
      entryType: string;
      amount: number;
      balanceAfter: number;
      createdAt: string;
    }>;
  } | null;
  familyMembers: Array<{
    id: string;
    fullName: string;
    relation: string;
    relationLabel: string;
    phone: string;
  }>;
};

export type AdminUserSignupAnalytics = {
  generatedAt: string;
  summary: {
    total: number;
    google: number;
    phone: number;
    other: number;
    todayTotal: number;
    todayGoogle: number;
    todayPhone: number;
    weekTotal: number;
    weekGoogle: number;
    weekPhone: number;
  };
  daily: Array<{
    date: string;
    total: number;
    google: number;
    phone: number;
  }>;
  recent: Array<{
    id: number;
    fullName: string;
    phone: string | null;
    displayEmail: string | null;
    signupMethod: UserSignupMethod;
    dateJoined: string | null;
  }>;
  salons: AdminSalonPlatformAnalytics;
  barbers?: AdminBarberPlatformAnalytics;
};

export type AdminSalonPlatformAnalytics = {
  summary: {
    total: number;
    published: number;
    pending: number;
    todayTotal: number;
    todayPublished: number;
    todayPending: number;
    weekTotal: number;
    weekPublished: number;
    weekPending: number;
  };
  daily: Array<{
    date: string;
    total: number;
    published: number;
    pending: number;
  }>;
  recent: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    region: string;
    regionLabel: string;
    isPublished: boolean;
    ownerName: string;
    createdAt: string | null;
  }>;
};

export type AdminBarberPlatformAnalytics = {
  summary: {
    total: number;
    independent: number;
    mybarberSalon: number;
    salonOwner: number;
    salonEmployee: number;
    other: number;
    todayTotal: number;
    todayIndependent: number;
    todaySalon: number;
    weekTotal: number;
    weekIndependent: number;
    weekSalon: number;
  };
  daily: Array<{
    date: string;
    total: number;
    independent: number;
    salon: number;
  }>;
  recent: Array<{
    id: number;
    fullName: string;
    phone: string;
    region: string;
    regionLabel: string;
    segment: string;
    ownedSalons: string[];
    worksAtSalons: string[];
    createdAt: string | null;
  }>;
};

export type PlatformLiveAnalytics = {
  generatedAt: string;
  summary: {
    clientsTotal: number;
    barbersTotal: number;
    salonsTotal: number;
    todaySignups: number;
    weekSignups: number;
    todayClients: number;
    todayBarbers: number;
    todaySalons: number;
  };
  combinedDaily: Array<{
    date: string;
    users: number;
    salons: number;
    barbers: number;
    total: number;
  }>;
  users: Omit<AdminUserSignupAnalytics, "salons" | "barbers">;
  barbers: AdminBarberPlatformAnalytics;
  salons: AdminSalonPlatformAnalytics;
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
  barbershop: number;
  beauty_salon: number;
  kind_unset: number;
};

export type AdminBusinessKind = "barbershop" | "beauty_salon" | "";

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
  business_kind: AdminBusinessKind;
  business_kind_label: string;
  email_verified: boolean;
  email_verified_at: string | null;
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
  business_kind: AdminBusinessKind;
  business_kind_label: string;
  barbers_count: number;
  reviews_count: number;
  rating: number;
  bookings_count: number;
  completed_bookings_count: number;
  revenue_uzs: number;
  favorites_count: number;
  lat: number;
  lng: number;
  created_at: string;
  owner_barber_id: string | null;
  owner_email: string;
  owner_name: string;
  owner_phone: string;
};

export type AdminSalonDetail = AdminSalon & {
  closed_weekdays: number[];
  hours: AdminSalonHour[];
  schedule_summary: string;
  staff_barbers: AdminSalonStaffRow[];
};

export type AdminBooking = {
  id: string;
  order_number: string;
  client_name: string;
  client_avatar: string;
  client_phone: string;
  barber_name: string;
  salon_name: string;
  service: string;
  price: number;
  start_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  paid_at: string | null;
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
  display_email?: string | null;
  email_verified?: boolean;
  email_verified_at?: string | null;
  first_name?: string;
  last_name?: string;
  full_name: string;
  phone: string | null;
  region: string;
  region_label?: string;
  latitude?: string;
  longitude?: string;
  location_city?: string;
  birth_year?: number | null;
  default_address?: string;
  family_members_count?: number;
  is_active: boolean;
  date_joined: string;
  bookings_count?: number;
  signup_method?: string;
  bookings_summary?: {
    total?: number;
    by_status?: Record<string, number>;
    spent_completed_uzs?: string | number;
  };
  recent_bookings?: Array<{
    id: number;
    barber_name?: string;
    salon_name?: string;
    region?: string;
    region_label?: string;
    start_at?: string;
    status?: string;
    total_price?: string | number;
    services_preview?: string;
    customer_phone?: string;
    created_at?: string;
  }>;
  booking_regions?: Array<{ region?: string; label?: string; bookings?: number }>;
  morph_ai?: {
    generations?: number;
    tryon?: number;
    analyze?: number;
    face_check?: number;
    studio?: number;
    success?: number;
    failed?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    candidates_tokens?: number;
    cost_usd?: string | number;
    last_at?: string | null;
  };
  recent_styles?: Array<{
    kind?: string;
    style_id?: string;
    style_title?: string;
    status?: string;
    created_at?: string;
    source?: string;
    total_tokens?: number;
    prompt_tokens?: number;
    candidates_tokens?: number;
    cost_usd?: string | number;
    model?: string;
    provider?: string;
    latency_ms?: number;
    error_detail?: string;
  }>;
  wallet?: {
    wallet_number?: string;
    balance?: string | number;
    recent_entries?: Array<{
      id?: string;
      entry_type?: string;
      amount?: string | number;
      balance_after?: string | number;
      created_at?: string;
    }>;
  } | null;
  family_members?: Array<{
    id?: number;
    full_name?: string;
    relation?: string;
    relation_label?: string;
    phone?: string;
  }>;
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
  business_kind?: string;
  business_kind_label?: string;
  onboarding_completed_at?: string | null;
  email_verified_at?: string | null;
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
  owner_phone?: string | null;
  is_published: boolean;
  premium?: boolean;
  business_kind?: string;
  latitude: string;
  longitude: string;
  created_at: string;
  closed_weekdays?: number[];
  hours?: Array<{ weekday: number; open_time: string; close_time: string }>;
  schedule_summary?: string;
  reviews_count?: number;
  rating?: number;
  barbers_count?: number;
  bookings_count?: number;
  completed_bookings_count?: number;
  revenue_uzs?: number | string;
  favorites_count?: number;
  staff_barbers?: BackendSalonStaffRow[];
};

type BackendBookingRow = {
  id: number;
  order_number?: string | null;
  salon_name?: string;
  customer_name?: string;
  customer_phone?: string;
  barber_name?: string;
  start_at: string;
  status: string;
  total_price: string;
  payment_method?: string;
  payment_status?: string;
  paid_at?: string | null;
  lines?: Array<{ service_name?: string; price?: string | number }>;
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
  bookings_week?: number;
  revenue_total?: string | number;
  reviews_total: number;
  regions?: Array<{
    region: string;
    label: string;
    barbers_count: number;
    salons_count: number;
    bookings_count?: number;
  }>;
};

function mapSignupMethod(raw: string | undefined): UserSignupMethod {
  const v = (raw || "").trim();
  if (v === "google" || v === "phone" || v === "email" || v === "unknown") return v;
  return "unknown";
}

function mapUser(u: BackendUserRow): AdminUser {
  return {
    id: String(u.id),
    name: u.full_name || u.display_email || u.email,
    firstName: u.first_name?.trim() || "",
    lastName: u.last_name?.trim() || "",
    phone: u.phone ?? "—",
    email: u.email,
    displayEmail: u.display_email ?? null,
    emailVerified: Boolean(u.email_verified),
    emailVerifiedAt: u.email_verified_at ?? null,
    region: u.region,
    regionLabel: (u.region_label || "").trim() || uzRegionLabel(u.region),
    latitude: (u.latitude || "").trim(),
    longitude: (u.longitude || "").trim(),
    locationCity: (u.location_city || "").trim(),
    birthYear: u.birth_year ?? null,
    defaultAddress: u.default_address?.trim() || "",
    familyMembersCount: toInt(u.family_members_count, 0),
    is_active: !!u.is_active,
    created_at: u.date_joined,
    bookings_count: toInt(u.bookings_count, 0),
  };
}

function mapUserDetail(u: BackendUserRow): AdminUserDetail {
  const base = mapUser(u);
  const morph = u.morph_ai ?? {};
  const summary = u.bookings_summary ?? {};
  return {
    ...base,
    signupMethod: mapSignupMethod(u.signup_method),
    bookingsSummary: {
      total: toInt(summary.total, base.bookings_count),
      byStatus: summary.by_status ?? {},
      spentCompletedUzs: toInt(summary.spent_completed_uzs, 0),
    },
    recentBookings: (u.recent_bookings ?? []).map((b) => ({
      id: String(b.id),
      barberName: b.barber_name || "—",
      salonName: b.salon_name || "—",
      region: b.region || "",
      regionLabel: b.region_label || "—",
      startAt: b.start_at || "",
      status: b.status || "",
      totalPrice: toInt(b.total_price, 0),
      servicesPreview: b.services_preview || "—",
      customerPhone: b.customer_phone || "",
    })),
    bookingRegions: (u.booking_regions ?? []).map((r) => ({
      region: r.region || "",
      label: r.label || r.region || "—",
      bookings: toInt(r.bookings, 0),
    })),
    morphAi: {
      generations: toInt(morph.generations, 0),
      tryon: toInt(morph.tryon, 0),
      analyze: toInt(morph.analyze, 0),
      faceCheck: toInt(morph.face_check, 0),
      studio: toInt(morph.studio, 0),
      success: toInt(morph.success, 0),
      failed: toInt(morph.failed, 0),
      totalTokens: toInt(morph.total_tokens, 0),
      promptTokens: toInt(morph.prompt_tokens, 0),
      candidatesTokens: toInt(morph.candidates_tokens, 0),
      costUsd: Number(morph.cost_usd ?? 0) || 0,
      lastAt: morph.last_at ?? null,
    },
    recentStyles: (u.recent_styles ?? []).map((s) => ({
      kind: s.kind || "",
      styleId: s.style_id || "",
      styleTitle: s.style_title || s.style_id || "—",
      status: s.status || "",
      createdAt: s.created_at || "",
      source: s.source || "",
      totalTokens: toInt(s.total_tokens, 0),
      promptTokens: toInt(s.prompt_tokens, 0),
      candidatesTokens: toInt(s.candidates_tokens, 0),
      costUsd: Number(s.cost_usd ?? 0) || 0,
      model: s.model || "",
      provider: s.provider || "",
      latencyMs: toInt(s.latency_ms, 0),
      errorDetail: s.error_detail || "",
    })),
    wallet: u.wallet
      ? {
          walletNumber: u.wallet.wallet_number || "—",
          balance: toInt(u.wallet.balance, 0),
          recentEntries: (u.wallet.recent_entries ?? []).map((e) => ({
            id: String(e.id ?? ""),
            entryType: e.entry_type || "",
            amount: toInt(e.amount, 0),
            balanceAfter: toInt(e.balance_after, 0),
            createdAt: e.created_at || "",
          })),
        }
      : null,
    familyMembers: (u.family_members ?? []).map((m) => ({
      id: String(m.id ?? ""),
      fullName: m.full_name || "—",
      relation: m.relation || "",
      relationLabel: m.relation_label || m.relation || "—",
      phone: m.phone || "",
    })),
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

function mapBusinessKind(raw: string | undefined): AdminBusinessKind {
  const v = (raw || "").trim();
  return v === "barbershop" || v === "beauty_salon" ? v : "";
}

function mapBarber(b: BackendBarberRow): AdminBarber {
  const coord = parseCoord(b.latitude, b.longitude);
  const account_segment = mapAccountSegment(b.account_segment);
  const business_kind = mapBusinessKind(b.business_kind);
  return {
    id: String(b.id),
    name: b.full_name || b.email,
    avatar: resolveMediaUrl(b.avatar) ?? "",
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
    business_kind,
    business_kind_label:
      (b.business_kind_label && String(b.business_kind_label).trim()) ||
      (business_kind === "beauty_salon"
        ? "Go'zallik saloni"
        : business_kind === "barbershop"
          ? "Sartaroshxona"
          : "Belgilanmagan"),
    email_verified: Boolean(b.email_verified_at),
    email_verified_at: b.email_verified_at ?? null,
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
  const business_kind = mapBusinessKind(s.business_kind);
  return {
    id: String(s.id),
    name: s.name,
    slug: s.slug ?? "",
    address: s.address,
    phone: s.phone ?? "",
    region: s.region ?? "",
    published: !!s.is_published,
    premium: !!s.premium,
    business_kind,
    business_kind_label:
      business_kind === "beauty_salon"
        ? "Go'zallik saloni"
        : business_kind === "barbershop"
          ? "Sartaroshxona"
          : "Belgilanmagan",
    barbers_count: toInt(s.barbers_count, 0),
    reviews_count: toInt(s.reviews_count, 0),
    rating: Number(s.rating ?? 0),
    bookings_count: toInt(s.bookings_count, 0),
    completed_bookings_count: toInt(s.completed_bookings_count, 0),
    revenue_uzs: toInt(s.revenue_uzs, 0),
    favorites_count: toInt(s.favorites_count, 0),
    lat: coord?.lat ?? Number.NaN,
    lng: coord?.lng ?? Number.NaN,
    created_at: s.created_at,
    owner_barber_id: s.owner_barber != null ? String(s.owner_barber) : null,
    owner_email: s.owner_email ?? "",
    owner_name: s.owner_name ?? "",
    owner_phone: s.owner_phone ?? "",
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
    weekly_bookings: stats.bookings_week ?? stats.bookings_today ?? 0,
    revenue_uzs: toInt(stats.revenue_total, 0),
    delta: { users: 0, barbers: 0, bookings: 0, revenue: 0 },
    regions: (stats.regions ?? []).map((r) => ({
      code: r.region,
      name: r.label || r.region,
      barbers: r.barbers_count ?? 0,
      salons: r.salons_count ?? 0,
      users: 0,
      bookings: r.bookings_count ?? 0,
    })),
  };
}

export async function fetchAdminBarberAnalytics(
  barberId: string,
  params: { start: string; end: string },
): Promise<import("./admin-analytics").AdminAnalyticsResponse> {
  const sp = new URLSearchParams({ start: params.start, end: params.end });
  return apiJson(`/api/v1/admin/barbers/${barberId}/analytics/?${sp}`);
}

export async function fetchAdminSalonAnalytics(
  salonId: string,
  params: { start: string; end: string },
): Promise<import("./admin-analytics").AdminAnalyticsResponse> {
  const sp = new URLSearchParams({ start: params.start, end: params.end });
  return apiJson(`/api/v1/admin/salons/${salonId}/analytics/?${sp}`);
}

export async function fetchAdminUserSignupAnalytics(limit = 100): Promise<AdminUserSignupAnalytics> {
  const sp = new URLSearchParams({ limit: String(limit) });
  const data = await apiJson<{
    generated_at: string;
    summary: {
      total: number;
      google: number;
      phone: number;
      other: number;
      today_total: number;
      today_google: number;
      today_phone: number;
      week_total: number;
      week_google: number;
      week_phone: number;
    };
    daily: Array<{ date: string; total: number; google: number; phone: number }>;
    recent: Array<{
      id: number;
      full_name: string;
      phone: string | null;
      display_email: string | null;
      signup_method: UserSignupMethod;
      date_joined: string | null;
    }>;
    salons: {
      summary: {
        total: number;
        published: number;
        pending: number;
        today_total: number;
        today_published: number;
        today_pending: number;
        week_total: number;
        week_published: number;
        week_pending: number;
      };
      daily: Array<{ date: string; total: number; published: number; pending: number }>;
      recent: Array<{
        id: number;
        name: string;
        address: string;
        phone: string;
        region: string;
        region_label: string;
        is_published: boolean;
        owner_name: string;
        created_at: string | null;
      }>;
    };
    barbers?: {
      summary: {
        total: number;
        independent: number;
        mybarber_salon: number;
        salon_owner: number;
        salon_employee: number;
        other: number;
        today_total: number;
        today_independent: number;
        today_salon: number;
        week_total: number;
        week_independent: number;
        week_salon: number;
      };
      daily: Array<{ date: string; total: number; independent: number; salon: number }>;
      recent: Array<{
        id: number;
        full_name: string;
        phone: string;
        region: string;
        region_label: string;
        segment: string;
        created_at: string | null;
      }>;
    };
  }>(`/api/v1/admin/users/signup-analytics/?${sp}`);

  const salons = data.salons ?? {
    summary: {
      total: 0,
      published: 0,
      pending: 0,
      today_total: 0,
      today_published: 0,
      today_pending: 0,
      week_total: 0,
      week_published: 0,
      week_pending: 0,
    },
    daily: [],
    recent: [],
  };

  return {
    generatedAt: data.generated_at,
    summary: {
      total: data.summary.total,
      google: data.summary.google,
      phone: data.summary.phone,
      other: data.summary.other,
      todayTotal: data.summary.today_total,
      todayGoogle: data.summary.today_google,
      todayPhone: data.summary.today_phone,
      weekTotal: data.summary.week_total,
      weekGoogle: data.summary.week_google,
      weekPhone: data.summary.week_phone,
    },
    daily: data.daily,
    recent: data.recent.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      displayEmail: row.display_email,
      signupMethod: row.signup_method,
      dateJoined: row.date_joined,
    })),
    salons: {
      summary: {
        total: salons.summary.total,
        published: salons.summary.published,
        pending: salons.summary.pending,
        todayTotal: salons.summary.today_total,
        todayPublished: salons.summary.today_published,
        todayPending: salons.summary.today_pending,
        weekTotal: salons.summary.week_total,
        weekPublished: salons.summary.week_published,
        weekPending: salons.summary.week_pending,
      },
      daily: salons.daily,
      recent: salons.recent.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        region: row.region,
        regionLabel: row.region_label,
        isPublished: row.is_published,
        ownerName: row.owner_name,
        createdAt: row.created_at,
      })),
    },
    barbers: parseBarberPlatformAnalytics(data.barbers),
  };
}

const EMPTY_BARBERS: AdminBarberPlatformAnalytics = {
  summary: {
    total: 0,
    independent: 0,
    mybarberSalon: 0,
    salonOwner: 0,
    salonEmployee: 0,
    other: 0,
    todayTotal: 0,
    todayIndependent: 0,
    todaySalon: 0,
    weekTotal: 0,
    weekIndependent: 0,
    weekSalon: 0,
  },
  daily: [],
  recent: [],
};

function parseBarberPlatformAnalytics(
  raw?: {
    summary: {
      total: number;
      independent: number;
      mybarber_salon: number;
      salon_owner: number;
      salon_employee: number;
      other: number;
      today_total: number;
      today_independent: number;
      today_salon: number;
      week_total: number;
      week_independent: number;
      week_salon: number;
    };
    daily: Array<{ date: string; total: number; independent: number; salon: number }>;
    recent: Array<{
      id: number;
      full_name: string;
      phone: string;
      region: string;
      region_label: string;
      segment: string;
      owned_salons?: string[];
      works_at_salons?: string[];
      created_at: string | null;
    }>;
  } | null,
): AdminBarberPlatformAnalytics {
  if (!raw) return EMPTY_BARBERS;
  return {
    summary: {
      total: raw.summary.total,
      independent: raw.summary.independent,
      mybarberSalon: raw.summary.mybarber_salon,
      salonOwner: raw.summary.salon_owner,
      salonEmployee: raw.summary.salon_employee,
      other: raw.summary.other,
      todayTotal: raw.summary.today_total,
      todayIndependent: raw.summary.today_independent,
      todaySalon: raw.summary.today_salon,
      weekTotal: raw.summary.week_total,
      weekIndependent: raw.summary.week_independent,
      weekSalon: raw.summary.week_salon,
    },
    daily: raw.daily,
    recent: raw.recent.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      region: row.region,
      regionLabel: row.region_label,
      segment: row.segment,
      ownedSalons: Array.isArray(row.owned_salons) ? row.owned_salons : [],
      worksAtSalons: Array.isArray(row.works_at_salons) ? row.works_at_salons : [],
      createdAt: row.created_at,
    })),
  };
}

function composeLiveFromSignup(data: AdminUserSignupAnalytics): PlatformLiveAnalytics {
  const barbers = data.barbers ?? EMPTY_BARBERS;
  const todaySignups =
    data.summary.todayTotal + barbers.summary.todayTotal + data.salons.summary.todayTotal;
  const weekSignups =
    data.summary.weekTotal + barbers.summary.weekTotal + data.salons.summary.weekTotal;

  const combinedDaily = Array.from(
    { length: Math.max(data.daily.length, data.salons.daily.length, barbers.daily.length) },
    (_, i) => {
      const u = data.daily[i];
      const s = data.salons.daily[i];
      const b = barbers.daily[i];
      const users = u?.total ?? 0;
      const salons = s?.total ?? 0;
      const barbersN = b?.total ?? 0;
      return {
        date: u?.date ?? s?.date ?? b?.date ?? "",
        users,
        salons,
        barbers: barbersN,
        total: users + salons + barbersN,
      };
    },
  );

  const { salons: _s, barbers: _b, ...users } = data;
  return {
    generatedAt: data.generatedAt,
    summary: {
      clientsTotal: data.summary.total,
      barbersTotal: barbers.summary.total,
      salonsTotal: data.salons.summary.total,
      todaySignups,
      weekSignups,
      todayClients: data.summary.todayTotal,
      todayBarbers: barbers.summary.todayTotal,
      todaySalons: data.salons.summary.todayTotal,
    },
    combinedDaily,
    users,
    barbers,
    salons: data.salons,
  };
}

export async function fetchPlatformLiveStats(limit = 50): Promise<PlatformLiveAnalytics> {
  const sp = new URLSearchParams({ limit: String(limit) });
  try {
    const data = await apiJson<{
    generated_at: string;
    summary: {
      clients_total: number;
      barbers_total: number;
      salons_total: number;
      today_signups: number;
      week_signups: number;
      today_clients: number;
      today_barbers: number;
      today_salons: number;
    };
    combined_daily: Array<{
      date: string;
      users: number;
      salons: number;
      barbers: number;
      total: number;
    }>;
    users: {
      generated_at: string;
      summary: {
        total: number;
        google: number;
        phone: number;
        other: number;
        today_total: number;
        today_google: number;
        today_phone: number;
        week_total: number;
        week_google: number;
        week_phone: number;
      };
      daily: Array<{ date: string; total: number; google: number; phone: number }>;
      recent: Array<{
        id: number;
        full_name: string;
        phone: string | null;
        display_email: string | null;
        signup_method: UserSignupMethod;
        date_joined: string | null;
      }>;
    };
    barbers: {
      summary: {
        total: number;
        independent: number;
        mybarber_salon: number;
        salon_owner: number;
        salon_employee: number;
        other: number;
        today_total: number;
        today_independent: number;
        today_salon: number;
        week_total: number;
        week_independent: number;
        week_salon: number;
      };
      daily: Array<{ date: string; total: number; independent: number; salon: number }>;
      recent: Array<{
        id: number;
        full_name: string;
        phone: string;
        region: string;
        region_label: string;
        segment: string;
        created_at: string | null;
      }>;
    };
    salons: {
      summary: {
        total: number;
        published: number;
        pending: number;
        today_total: number;
        today_published: number;
        today_pending: number;
        week_total: number;
        week_published: number;
        week_pending: number;
      };
      daily: Array<{ date: string; total: number; published: number; pending: number }>;
      recent: Array<{
        id: number;
        name: string;
        address: string;
        phone: string;
        region: string;
        region_label: string;
        is_published: boolean;
        owner_name: string;
        created_at: string | null;
      }>;
    };
  }>(`/api/v1/admin/statistics/live/?${sp}`);

    return {
      generatedAt: data.generated_at,
    summary: {
      clientsTotal: data.summary.clients_total,
      barbersTotal: data.summary.barbers_total,
      salonsTotal: data.summary.salons_total,
      todaySignups: data.summary.today_signups,
      weekSignups: data.summary.week_signups,
      todayClients: data.summary.today_clients,
      todayBarbers: data.summary.today_barbers,
      todaySalons: data.summary.today_salons,
    },
    combinedDaily: data.combined_daily,
    users: {
      generatedAt: data.users.generated_at,
      summary: {
        total: data.users.summary.total,
        google: data.users.summary.google,
        phone: data.users.summary.phone,
        other: data.users.summary.other,
        todayTotal: data.users.summary.today_total,
        todayGoogle: data.users.summary.today_google,
        todayPhone: data.users.summary.today_phone,
        weekTotal: data.users.summary.week_total,
        weekGoogle: data.users.summary.week_google,
        weekPhone: data.users.summary.week_phone,
      },
      daily: data.users.daily,
      recent: data.users.recent.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        displayEmail: row.display_email,
        signupMethod: row.signup_method,
        dateJoined: row.date_joined,
      })),
    },
    barbers: {
      summary: {
        total: data.barbers.summary.total,
        independent: data.barbers.summary.independent,
        mybarberSalon: data.barbers.summary.mybarber_salon,
        salonOwner: data.barbers.summary.salon_owner,
        salonEmployee: data.barbers.summary.salon_employee,
        other: data.barbers.summary.other,
        todayTotal: data.barbers.summary.today_total,
        todayIndependent: data.barbers.summary.today_independent,
        todaySalon: data.barbers.summary.today_salon,
        weekTotal: data.barbers.summary.week_total,
        weekIndependent: data.barbers.summary.week_independent,
        weekSalon: data.barbers.summary.week_salon,
      },
      daily: data.barbers.daily,
      recent: data.barbers.recent.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        region: row.region,
        regionLabel: row.region_label,
        segment: row.segment,
        createdAt: row.created_at,
      })),
    },
    salons: {
      summary: {
        total: data.salons.summary.total,
        published: data.salons.summary.published,
        pending: data.salons.summary.pending,
        todayTotal: data.salons.summary.today_total,
        todayPublished: data.salons.summary.today_published,
        todayPending: data.salons.summary.today_pending,
        weekTotal: data.salons.summary.week_total,
        weekPublished: data.salons.summary.week_published,
        weekPending: data.salons.summary.week_pending,
      },
      daily: data.salons.daily,
      recent: data.salons.recent.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        region: row.region,
        regionLabel: row.region_label,
        isPublished: row.is_published,
        ownerName: row.owner_name,
        createdAt: row.created_at,
      })),
    },
    };
  } catch {
    const signup = await fetchAdminUserSignupAnalytics(limit);
    return composeLiveFromSignup(signup);
  }
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

export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const row = await apiJson<BackendUserRow>(`/api/v1/admin/users/${id}/`);
  return mapUserDetail(row);
}

export async function patchAdminUser(
  id: string,
  body: Partial<{ is_active: boolean; full_name: string; phone: string }>,
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
  business_kind?: AdminBusinessKind | "unset" | "";
}): Promise<Paginated<AdminBarber>> {
  const page = params?.page ?? 1;
  const res = await apiFetch(
    (() => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.region) sp.set("region", params.region);
      if (params?.segment) sp.set("segment", params.segment);
      if (params?.business_kind) sp.set("business_kind", params.business_kind);
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
  body: Partial<{ full_name: string; phone: string; is_active: boolean }>,
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
    order_number: b.order_number ?? `MS-${b.id}`,
    client_name: b.customer_name ?? "—",
    client_avatar: avatarFor(`c${b.id}`),
    client_phone: b.customer_phone ?? "",
    barber_name: b.barber_name ?? "—",
    salon_name: b.salon_name ?? "—",
    service: b.lines?.[0]?.service_name ?? "—",
    price: Math.max(0, toInt(b.total_price, 0)),
    start_at: b.start_at,
    status: b.status,
    payment_method: b.payment_method ?? "",
    payment_status: b.payment_status ?? "",
    paid_at: b.paid_at ?? null,
    region: "",
  };
}

export async function fetchAdminBookings(params?: {
  status?: string;
  barber?: string;
  search?: string;
  page?: number;
}): Promise<Paginated<AdminBooking>> {
  const page = params?.page ?? 1;
  const sp = new URLSearchParams();
  if (params?.status && params.status !== "all") sp.set("status", params.status);
  if (params?.barber?.trim()) sp.set("barber", params.barber.trim());
  if (params?.search?.trim()) sp.set("search", params.search.trim());
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

export async function fetchAdminBookingDetail(id: string): Promise<AdminBooking & { lines?: Array<{ service_name: string; price: number }> }> {
  const b = await apiJson<BackendBookingRow>(`/api/v1/admin/bookings/${id}/`);
  return {
    ...mapAdminBookingRow(b),
    lines: (b.lines ?? []).map((line) => ({
      service_name: line.service_name ?? "—",
      price: Math.max(0, toInt(line.price, 0)),
    })),
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
  for_barbershop: boolean;
  for_beauty_salon: boolean;
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
  for_barbershop: boolean;
  for_beauty_salon: boolean;
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

function mapAdminService(s: any): AdminService {
  return {
    id: String(s.id),
    name: String(s.name || ""),
    slug: String(s.slug || ""),
    description: String(s.description || ""),
    image_url: String(s.image_url || ""),
    duration_minutes: Number(s.duration_minutes || 0),
    is_active: !!s.is_active,
    sort_order: Number(s.sort_order || 0),
    for_barbershop: s.for_barbershop !== false,
    for_beauty_salon: !!s.for_beauty_salon,
    category_ids: Array.isArray(s.category_ids) ? s.category_ids.map((x: any) => String(x)) : [],
    category_names: Array.isArray(s.category_names) ? s.category_names.map((x: any) => String(x)) : [],
    linked_rows_count: Number(s.linked_rows_count || 0),
  };
}

function mapServiceCategory(c: any): ServiceCategory {
  return {
    id: String(c.id),
    name: String(c.name || ""),
    icon: String(c.icon || ""),
    order: Number(c.order || 0),
    services_count: Number(c.services_count || 0),
    for_barbershop: c.for_barbershop !== false,
    for_beauty_salon: !!c.for_beauty_salon,
  };
}

export async function fetchCategories(): Promise<ServiceCategory[]> {
  const res = await apiFetch("/api/v1/admin/categories/");
  const j = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j as { results?: unknown[] }).results || [];
  return (rows as any[]).map(mapServiceCategory);
}

export async function createCategory(body: {
  name: string;
  icon?: string;
  order?: number;
  for_barbershop?: boolean;
  for_beauty_salon?: boolean;
}): Promise<ServiceCategory> {
  const row = await apiJson<Record<string, unknown>>("/api/v1/admin/categories/", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapServiceCategory(row);
}

export async function updateCategory(
  id: string,
  body: Partial<{
    name: string;
    icon: string;
    order: number;
    is_active: boolean;
    for_barbershop: boolean;
    for_beauty_salon: boolean;
  }>,
): Promise<ServiceCategory> {
  const row = await apiJson<Record<string, unknown>>(`/api/v1/admin/categories/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapServiceCategory(row);
}

export async function deleteCategory(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/categories/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "Kategoriya o'chirilmadi");
  }
}

export async function fetchServices(params?: {
  q?: string;
  category?: string;
  business_kind?: string;
}): Promise<AdminService[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.category && params.category !== "all") sp.set("category", params.category);
  if (params?.business_kind) sp.set("business_kind", params.business_kind);
  const res = await apiFetch(`/api/v1/admin/services/?${sp.toString()}`);
  const j = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error((j as { detail?: string }).detail || "Xato");
  const rows = Array.isArray(j) ? j : (j as { results?: unknown[] }).results || [];
  return (rows as any[]).map(mapAdminService);
}

export async function createService(body: {
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
  for_barbershop: boolean;
  for_beauty_salon: boolean;
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
  return mapAdminService(j);
}

export async function updateService(
  id: string,
  body: Partial<
    Pick<
      AdminService,
      | "name"
      | "description"
      | "image_url"
      | "duration_minutes"
      | "is_active"
      | "sort_order"
      | "for_barbershop"
      | "for_beauty_salon"
      | "category_ids"
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
  return mapAdminService(j);
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

export type PlatformIncome = {
  range: StatDateRange;
  summary: {
    platform_net: number;
    today_net: number | null;
    gift_design_fees: number;
    subscriptions: number;
    b2b_promotions: number;
    other: number;
  };
  sources: Array<{ key: string; label: string; amount: number; count: number }>;
  gifts: {
    design_fee_total: number;
    count: number;
    by_design: Array<{
      design_id: string;
      design_name: string;
      count: number;
      fee_total: number;
    }>;
  };
  subscriptions: {
    revenue_uzs: number;
    count: number;
    by_provider: Array<{ provider: string; count: number; revenue_uzs: number }>;
  };
  promotions: {
    revenue_uzs: number;
    count: number;
  };
  other: {
    revenue_uzs: number;
    count: number;
  };
  recent: Array<{
    id: string;
    kind: string;
    label: string;
    payer_name: string;
    payer_type: string;
    payer_id?: number | null;
    amount: number;
    created_at: string | null;
  }>;
};

export async function fetchPlatformIncome(range?: StatDateRange): Promise<PlatformIncome> {
  return apiJson<PlatformIncome>(`/api/v1/admin/finance/platform-income/${rangeQuery(range)}`);
}

export type PlatformTurnover = {
  range: StatDateRange;
  summary: {
    total_turnover: number;
    today_turnover: number;
    booking_gmv: number;
    cash_gmv: number;
    online_gmv: number;
    topup_total: number;
    gift_amount_total: number;
    wallet_booking_spend: number;
  };
  b2b: {
    label: string;
    cash_total: number;
    cash_count: number;
    online_total: number;
    online_count: number;
    total: number;
    completed_count: number;
  };
  b2c: {
    label: string;
    topup_total: number;
    topup_count: number;
    gift_amount_total: number;
    gift_count: number;
    wallet_booking_spend: number;
    wallet_booking_count: number;
    topup_sources: Array<{ source: string; amount: number; count: number }>;
  };
  streams: Array<{ key: string; label: string; amount: number; count: number }>;
};

export async function fetchPlatformTurnover(range?: StatDateRange): Promise<PlatformTurnover> {
  return apiJson<PlatformTurnover>(
    `/api/v1/admin/finance/platform-turnover/${rangeQuery(range)}`,
  );
}

export type AdminGiftTransfer = {
  id: string;
  sender: { id: number | null; name: string; phone: string | null };
  recipient: { id: number | null; name: string; phone: string | null };
  amount: number;
  design_id: string;
  design_name: string;
  design_fee: number;
  total_charged: number;
  message: string;
  status: string;
  created_at: string | null;
};

export type AdminGiftsResponse = Paginated<AdminGiftTransfer> & {
  summary: {
    count: number;
    amount_total: number;
    design_fee_total: number;
    charged_total: number;
  };
};

export async function fetchAdminGifts(params?: {
  q?: string;
  design_id?: string;
  status?: string;
  start?: string;
  end?: string;
  page?: number;
}): Promise<AdminGiftsResponse> {
  const page = params?.page ?? 1;
  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set("q", params.q.trim());
  if (params?.design_id && params.design_id !== "all") sp.set("design_id", params.design_id);
  if (params?.status && params.status !== "all") sp.set("status", params.status);
  if (params?.start) sp.set("start", params.start);
  if (params?.end) sp.set("end", params.end);
  sp.set("page", String(page));
  const j = await apiJson<{
    results?: AdminGiftTransfer[];
    count?: number;
    page_size?: number;
    page?: number;
    summary?: AdminGiftsResponse["summary"];
  }>(`/api/v1/admin/finance/gifts/?${sp}`);
  const results = j.results ?? [];
  const count = toInt(j.count, results.length);
  const pageSize = toInt(j.page_size, PAGE_SIZE);
  return {
    results,
    count,
    page: toInt(j.page, page),
    page_size: pageSize,
    total_pages: totalPages(count, pageSize),
    summary: j.summary ?? {
      count: 0,
      amount_total: 0,
      design_fee_total: 0,
      charged_total: 0,
    },
  };
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

export type AdminPromotion = {
  id: string;
  barber_name: string;
  barber_email: string;
  barber_avatar: string;
  promotion_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  region: string;
  notes: string;
  package_label: string;
  created_at: string;
};

export async function fetchPromotions(status?: string): Promise<AdminPromotion[]> {
  const url = status
    ? `/api/v1/admin/marketing/promotions/?status=${encodeURIComponent(status)}`
    : "/api/v1/admin/marketing/promotions/";
  const res = await apiFetch(url);
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  const rows = Array.isArray(j) ? j : j.results || [];
  return rows.map((p: any) => ({
    id: String(p.id),
    barber_name: String(p.barber_name || ""),
    barber_email: String(p.barber_email || ""),
    barber_avatar: String(p.barber_avatar || ""),
    promotion_type: String(p.promotion_type || ""),
    status: String(p.status || ""),
    starts_at: String(p.starts_at || ""),
    ends_at: String(p.ends_at || ""),
    amount_paid: Number(p.amount_paid || 0),
    region: String(p.region || ""),
    notes: String(p.notes || ""),
    package_label: String(p.package_label || ""),
    created_at: String(p.created_at || ""),
  }));
}

export async function approvePromotion(id: string): Promise<AdminPromotion> {
  const res = await apiFetch(`/api/v1/admin/marketing/promotions/${id}/approve/`, { method: "POST" });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  return {
    id: String(j.id),
    barber_name: String(j.barber_name || ""),
    barber_email: String(j.barber_email || ""),
    barber_avatar: String(j.barber_avatar || ""),
    promotion_type: String(j.promotion_type || ""),
    status: String(j.status || ""),
    starts_at: String(j.starts_at || ""),
    ends_at: String(j.ends_at || ""),
    amount_paid: Number(j.amount_paid || 0),
    region: String(j.region || ""),
    notes: String(j.notes || ""),
    package_label: String(j.package_label || ""),
    created_at: String(j.created_at || ""),
  };
}

export async function rejectPromotion(id: string): Promise<AdminPromotion> {
  const res = await apiFetch(`/api/v1/admin/marketing/promotions/${id}/reject/`, { method: "POST" });
  const j = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(j.detail || "Xato");
  return {
    id: String(j.id),
    barber_name: String(j.barber_name || ""),
    barber_email: String(j.barber_email || ""),
    barber_avatar: String(j.barber_avatar || ""),
    promotion_type: String(j.promotion_type || ""),
    status: String(j.status || ""),
    starts_at: String(j.starts_at || ""),
    ends_at: String(j.ends_at || ""),
    amount_paid: Number(j.amount_paid || 0),
    region: String(j.region || ""),
    notes: String(j.notes || ""),
    package_label: String(j.package_label || ""),
    created_at: String(j.created_at || ""),
  };
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

// ============= Platform statistika (B2B / B2C) =============

export type StatDateRange = { start: string; end: string };

export type PlatformOverview = {
  range: StatDateRange;
  b2c: {
    clients_total: number;
    active_clients: number;
    total_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    success_rate: number;
    cash_count: number;
    online_count: number;
  };
  b2b: {
    barbers_total: number;
    barbers_independent: number;
    barbers_salon_owner: number;
    barbers_salon_employee: number;
    barbers_mybarber_salon: number;
    salons_total: number;
    salons_published: number;
    pending_payouts: number;
  };
  revenue: {
    gmv: number;
    cash_total: number;
    online_total: number;
    cash_count: number;
    online_count: number;
  };
};

export type RevenueSeriesPoint = {
  key: string;
  label: string;
  cash: number;
  online: number;
  total: number;
  count: number;
};

export type RevenueAnalytics = {
  granularity: "day" | "week" | "month";
  series: RevenueSeriesPoint[];
  summary: {
    gmv: number;
    cash_total: number;
    online_total: number;
    cash_count: number;
    online_count: number;
  };
  top_barbers: Array<{ id: number; name: string; revenue: number; count: number }>;
  top_salons: Array<{ id: number; name: string; revenue: number; count: number }>;
};

export type WalletAnalytics = {
  summary: {
    topup_total: number;
    topup_users: number;
    spend_total: number;
    spend_users: number;
    gift_total: number;
    gift_count: number;
    refund_total: number;
  };
  topup_sources: Array<{ source: string; amount: number; count: number }>;
  spend_types: Array<{ type: string; label: string; amount: number; count: number }>;
  recent: Array<{
    id: string;
    user_name: string;
    entry_type: string;
    amount: number;
    balance_after: number;
    source: string;
    created_at: string | null;
  }>;
};

export type BookingsAnalytics = {
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    success_rate: number;
    cash_count: number;
    online_count: number;
    cash_barbers: number;
    cash_salons: number;
  };
  funnel: Array<{ status: string; label: string; count: number }>;
  results: any[];
  count: number;
  page: number;
  total_pages: number;
};

function rangeQuery(range?: Partial<StatDateRange>): string {
  const sp = new URLSearchParams();
  if (range?.start) sp.set("start", range.start);
  if (range?.end) sp.set("end", range.end);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchPlatformOverview(range?: StatDateRange): Promise<PlatformOverview> {
  return apiJson<PlatformOverview>(`/api/v1/admin/statistics/overview/${rangeQuery(range)}`);
}

export async function fetchPlatformRevenue(
  range?: StatDateRange,
  granularity: "day" | "week" | "month" = "month",
): Promise<RevenueAnalytics> {
  const sp = new URLSearchParams();
  if (range?.start) sp.set("start", range.start);
  if (range?.end) sp.set("end", range.end);
  sp.set("granularity", granularity);
  return apiJson<RevenueAnalytics>(`/api/v1/admin/statistics/revenue/?${sp}`);
}

export async function fetchPlatformWallet(range?: StatDateRange): Promise<WalletAnalytics> {
  return apiJson<WalletAnalytics>(`/api/v1/admin/statistics/wallet/${rangeQuery(range)}`);
}

export async function fetchPlatformBookings(params: {
  range?: StatDateRange;
  status?: string;
  paymentMethod?: string;
  page?: number;
}): Promise<BookingsAnalytics> {
  const sp = new URLSearchParams();
  if (params.range?.start) sp.set("start", params.range.start);
  if (params.range?.end) sp.set("end", params.range.end);
  if (params.status) sp.set("status", params.status);
  if (params.paymentMethod) sp.set("payment_method", params.paymentMethod);
  if (params.page) sp.set("page", String(params.page));
  return apiJson<BookingsAnalytics>(`/api/v1/admin/statistics/bookings/?${sp}`);
}

export async function downloadStatisticsCsv(
  type: "overview" | "revenue" | "users" | "salons" | "barbers" | "wallet" | "bookings",
  params: {
    range?: StatDateRange;
    granularity?: "day" | "week" | "month";
    status?: string;
    paymentMethod?: string;
  } = {},
): Promise<void> {
  const sp = new URLSearchParams();
  if (params.range?.start) sp.set("start", params.range.start);
  if (params.range?.end) sp.set("end", params.range.end);
  if (params.granularity) sp.set("granularity", params.granularity);
  if (params.status) sp.set("status", params.status);
  if (params.paymentMethod) sp.set("payment_method", params.paymentMethod);
  const res = await apiFetch(`/api/v1/admin/statistics/export/${type}/?${sp}`);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(j.detail || "Yuklab olishda xatolik");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `${type}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type MorphAiAnalytics = {
  generated_at: string;
  range: { start: string; end: string };
  live: {
    active_users_15m: number;
    generations_15m: number;
    tryon_15m: number;
    queue: { enabled: boolean; depth: number };
  };
  summary: {
    generations: number;
    success: number;
    failed: number;
    success_rate: number;
    tryon: number;
    analyze: number;
    face_check: number;
    studio: number;
    unique_users: number;
    total_tokens: number;
    prompt_tokens: number;
    candidates_tokens: number;
    total_cost_usd: string;
    avg_cost_usd: string;
    avg_tokens: number;
    avg_latency_ms: number;
    tryon_avg_cost_usd: string;
    tryon_min_cost_usd: string;
    tryon_max_cost_usd: string;
    tryon_total_cost_usd: string;
    tryon_total_tokens: number;
  };
  daily: Array<{
    date: string;
    generations: number;
    tryon: number;
    analyze: number;
    tokens: number;
    cost_usd: string;
    users: number;
  }>;
  top_users: Array<{
    user_id: number;
    name: string;
    phone: string;
    email: string;
    generations: number;
    tryon: number;
    analyze: number;
    studio: number;
    tokens: number;
    prompt_tokens: number;
    candidates_tokens: number;
    cost_usd: string;
    last_at: string | null;
  }>;
  recent: Array<{
    id: number;
    user_id: number | null;
    user_name: string;
    kind: string;
    status: string;
    style_id: string;
    style_title: string;
    prompt: string;
    model: string;
    provider: string;
    prompt_tokens: number;
    candidates_tokens: number;
    total_tokens: number;
    cost_usd: string;
    tokens_estimated: boolean;
    latency_ms: number;
    error_detail: string;
    job_id: string;
    created_at: string;
  }>;
};

export async function fetchMorphAiAnalytics(params?: {
  range?: StatDateRange;
  limit?: number;
  top?: number;
}): Promise<MorphAiAnalytics> {
  const sp = new URLSearchParams();
  if (params?.range?.start) sp.set("start", params.range.start);
  if (params?.range?.end) sp.set("end", params.range.end);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.top) sp.set("top", String(params.top));
  const q = sp.toString();
  return apiJson<MorphAiAnalytics>(`/api/v1/admin/morph-ai/${q ? `?${q}` : ""}`);
}

export type MorphHairstyle = {
  style_id: string;
  slug: string;
  audience: string;
  category: string;
  title: string;
  title_uz: string;
  face_shapes: string[];
  hair_length: string;
  image_path: string;
  description_uz: string;
  tags: string[];
  age_groups: string[];
  is_published: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type MorphAiSettings = {
  daily_tryon_limit_per_user: number;
  daily_analyze_limit_per_user: number;
  daily_budget_usd: string;
  budget_enforce: boolean;
  alert_success_rate_below: number;
  tryon_enabled: boolean;
  analyze_enabled: boolean;
  custom_tryon_prompt: string;
  custom_tryon_prompt_b: string;
  ab_enabled: boolean;
  ab_traffic_percent_b: number;
  preferred_model: string;
  gallery_public: boolean;
  runtime_model: string;
  updated_at: string | null;
};

function morphRangeQs(range?: StatDateRange, extra?: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  if (range?.start) sp.set("start", range.start);
  if (range?.end) sp.set("end", range.end);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    }
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function downloadMorphAiCsv(range?: StatDateRange): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/morph-ai/export/${morphRangeQs(range)}`);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "CSV yuklab bo'lmadi");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "morph-ai-usage.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export const MORPH_AI_LIST_KINDS = [
  "generations",
  "spenders",
  "errors",
  "active-users",
  "queue",
  "daily",
  "gallery",
] as const;

export type MorphAiListKind = (typeof MORPH_AI_LIST_KINDS)[number];

export type MorphAiListResponse = Paginated<Record<string, unknown>> & {
  kind: MorphAiListKind;
  range?: { start: string; end: string };
  media_note?: string | null;
};

export async function fetchMorphAiList(
  kind: MorphAiListKind,
  params?: { range?: StatDateRange; page?: number; pageSize?: number },
): Promise<MorphAiListResponse> {
  const sp = new URLSearchParams();
  if (params?.range?.start) sp.set("start", params.range.start);
  if (params?.range?.end) sp.set("end", params.range.end);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("page_size", String(params.pageSize));
  const q = sp.toString();
  return apiJson<MorphAiListResponse>(
    `/api/v1/admin/morph-ai/list/${encodeURIComponent(kind)}/${q ? `?${q}` : ""}`,
  );
}

export async function downloadMorphAiListCsv(
  kind: MorphAiListKind,
  range?: StatDateRange,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/admin/morph-ai/list/${encodeURIComponent(kind)}/export/${morphRangeQs(range)}`,
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error((j as { detail?: string }).detail || "CSV yuklab bo'lmadi");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `morph-ai-${kind}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchMorphHairstyles(params?: {
  audience?: string;
  q?: string;
  published?: string;
}): Promise<MorphHairstyle[]> {
  const sp = new URLSearchParams();
  if (params?.audience) sp.set("audience", params.audience);
  if (params?.q) sp.set("q", params.q);
  if (params?.published) sp.set("published", params.published);
  const q = sp.toString();
  return apiJson(`/api/v1/admin/morph-ai/catalog/${q ? `?${q}` : ""}`);
}

export async function createMorphHairstyle(
  body: Partial<MorphHairstyle> & { title: string },
): Promise<MorphHairstyle> {
  return apiJson("/api/v1/admin/morph-ai/catalog/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchMorphHairstyle(
  styleId: string,
  body: Partial<MorphHairstyle>,
): Promise<MorphHairstyle> {
  return apiJson(`/api/v1/admin/morph-ai/catalog/${encodeURIComponent(styleId)}/`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function fetchMorphAiErrors(params?: { range?: StatDateRange; limit?: number }) {
  return apiJson<{
    summary: {
      total: number;
      failed: number;
      success: number;
      success_rate: number;
      alert: boolean;
      alert_threshold: number;
    };
    top_errors: Array<{ detail: string; count: number; last_at: string | null }>;
    by_kind: Array<{ kind: string; count: number }>;
    recent: Array<{
      id: number;
      user_id: number | null;
      user_name: string;
      kind: string;
      style_title: string;
      error_detail: string;
      created_at: string;
    }>;
  }>(`/api/v1/admin/morph-ai/errors/${morphRangeQs(params?.range, { limit: params?.limit })}`);
}

export async function fetchMorphAiPopularity(params?: { range?: StatDateRange; limit?: number }) {
  return apiJson<{
    styles: Array<{
      style_id: string;
      style_title: string;
      generations: number;
      success: number;
      failed: number;
      users: number;
      tokens: number;
      cost_usd: string;
      is_published: boolean | null;
    }>;
  }>(`/api/v1/admin/morph-ai/popularity/${morphRangeQs(params?.range, { limit: params?.limit })}`);
}

export async function fetchMorphAiConversion(params?: { range?: StatDateRange }) {
  return apiJson<{
    summary: {
      tryon_users: number;
      booked_users: number;
      conversion_rate: number;
      same_day_bookings: number;
    };
  }>(`/api/v1/admin/morph-ai/conversion/${morphRangeQs(params?.range)}`);
}

export async function fetchMorphAiBudget(params?: { range?: StatDateRange }) {
  return apiJson<{
    settings: { daily_budget_usd: string; budget_enforce: boolean };
    period: {
      start: string;
      end: string;
      spent_usd: string;
      remaining_usd: string | null;
      percent_used: number;
      blocked: boolean;
      generations: number;
      tryon: number;
    };
    today: { spent_usd: string };
    daily: Array<{ date: string; cost_usd: string; generations: number }>;
  }>(`/api/v1/admin/morph-ai/budget/${morphRangeQs(params?.range)}`);
}

export async function fetchMorphAiLimits() {
  return apiJson<{
    settings: MorphAiSettings;
    heavy_users_today: Array<{
      user_id: number;
      name: string;
      phone: string;
      tryon_today: number;
      cost_usd: string;
      over_limit: boolean;
    }>;
  }>("/api/v1/admin/morph-ai/limits/");
}

export async function fetchMorphAiQueue() {
  return apiJson<{
    enabled: boolean;
    depth: number;
    max_depth: number;
    queued_sample: Array<{
      job_id: string;
      user_id: number | null;
      style_title: string;
      status: string;
      created_at?: string;
    }>;
    processing_sample: Array<{
      job_id: string;
      user_id?: number;
      style_title: string;
      updated_at?: string;
    }>;
  }>("/api/v1/admin/morph-ai/queue/");
}

export async function clearMorphAiQueue() {
  return apiJson<{ ok: boolean; cleared: number; detail?: string }>("/api/v1/admin/morph-ai/queue/", {
    method: "POST",
    body: JSON.stringify({ action: "clear" }),
  });
}

export async function fetchMorphAiGallery(limit = 40) {
  return apiJson<{
    items: Array<{
      id: number;
      user_id: number;
      user_name: string;
      source: string;
      face_shape_key: string;
      hair_type_key: string;
      photo_url: string | null;
      photo_missing?: boolean;
      created_at: string;
    }>;
    media_note?: string | null;
  }>(`/api/v1/admin/morph-ai/gallery/?limit=${limit}`);
}

export async function fetchMorphAiSettings(): Promise<MorphAiSettings> {
  return apiJson("/api/v1/admin/morph-ai/settings/");
}

export async function patchMorphAiSettings(
  body: Partial<{
    daily_tryon_limit_per_user: number;
    daily_analyze_limit_per_user: number;
    daily_budget_usd: string | number;
    budget_enforce: boolean;
    alert_success_rate_below: number;
    tryon_enabled: boolean;
    analyze_enabled: boolean;
    custom_tryon_prompt: string;
    custom_tryon_prompt_b: string;
    ab_enabled: boolean;
    ab_traffic_percent_b: number;
    preferred_model: string;
    gallery_public: boolean;
  }>,
): Promise<MorphAiSettings> {
  return apiJson("/api/v1/admin/morph-ai/settings/", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/* —— B2C Subscriptions —— */

export type AdminSubscriptionPaymentRow = {
  id: string;
  user_id: number;
  plan_code: string;
  amount_uzs: number;
  provider: string;
  status: string;
  order_id: string;
  transaction_id?: string;
  paid_at: string | null;
  created_at: string;
  subscription_id: string | null;
  promo_code: string | null;
  discount_uzs: number;
  base_uzs: number;
  discount_pct: number;
  has_discount: boolean;
  user_name?: string;
  user_phone?: string;
  user?: { id: number; full_name: string; phone: string; email: string };
};

export type AdminSubscriptionStats = {
  active_count: number;
  expired_count: number;
  deactivated_count: number;
  pending_payments: number;
  revenue_uzs: number;
  paid_count: number;
  unique_buyers: number;
  new_subscriptions: number;
  purchases_today: number;
  purchases_this_week: number;
  purchases_this_month: number;
  buyers_today: number;
  buyers_this_week: number;
  buyers_this_month: number;
  discounted_count: number;
  discounted_buyers: number;
  discount_total_uzs: number;
  by_plan: Array<{ plan_code: string; count: number }>;
  by_plan_purchases: Array<{
    plan_code: string;
    count: number;
    buyers: number;
    revenue_uzs: number;
  }>;
  by_source: Array<{ source: string; count: number }>;
  by_provider: Array<{ provider: string; count: number; revenue_uzs: number }>;
  by_promo: Array<{
    promo_code: string;
    count: number;
    buyers: number;
    discount_uzs: number;
    revenue_uzs: number;
  }>;
  purchases_by_day: Array<{
    date: string;
    count: number;
    buyers: number;
    revenue_uzs: number;
  }>;
  recent_purchases: AdminSubscriptionPaymentRow[];
  recent_discounted: AdminSubscriptionPaymentRow[];
  referral_trials_granted: number;
  usage_totals: { morph_ai: number; morph_studio: number };
  recent_events: Array<{
    id: string;
    action: string;
    actor: string;
    detail: Record<string, unknown>;
    created_at: string;
    user_id: number | null;
    user_name: string;
    plan_code: string | null;
  }>;
  plans: Array<{ code: string; name_uz: string; price_uzs: number }>;
};

export type AdminSubscriptionRow = {
  id: string;
  plan_code: string;
  status: string;
  source: string;
  starts_at: string | null;
  ends_at: string | null;
  price_uzs: number;
  created_at?: string;
  user: { id: number; full_name: string; phone: string; email: string };
  usage: {
    morph_ai_used: number;
    morph_ai_limit: number;
    morph_ai_remaining: number;
    morph_studio_used: number;
    morph_studio_limit: number;
    morph_studio_remaining: number;
  };
};

export async function fetchAdminSubscriptionStats(params?: {
  start?: string;
  end?: string;
}): Promise<AdminSubscriptionStats> {
  const sp = new URLSearchParams();
  if (params?.start) sp.set("start", params.start);
  if (params?.end) sp.set("end", params.end);
  const qs = sp.toString();
  return apiJson(
    qs ? `/api/v1/admin/subscriptions/stats/?${qs}` : "/api/v1/admin/subscriptions/stats/",
  );
}

export async function fetchAdminSubscriptions(params?: {
  status?: string;
  plan?: string;
  q?: string;
  page?: number;
}): Promise<{ count: number; page: number; results: AdminSubscriptionRow[] }> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.plan) sp.set("plan", params.plan);
  if (params?.q) sp.set("q", params.q);
  if (params?.page) sp.set("page", String(params.page));
  const qs = sp.toString();
  const base = "/api/v1/admin/subscriptions/";
  return apiJson(qs ? `${base}?${qs}` : base);
}

export async function fetchAdminSubscriptionPayments(params?: {
  status?: string;
  plan?: string;
  provider?: string;
  promo?: string;
  discounted?: boolean;
  q?: string;
  page?: number;
  start?: string;
  end?: string;
}): Promise<{ count: number; page: number; results: AdminSubscriptionPaymentRow[] }> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.plan) sp.set("plan", params.plan);
  if (params?.provider) sp.set("provider", params.provider);
  if (params?.promo) sp.set("promo", params.promo);
  if (params?.discounted) sp.set("discounted", "1");
  if (params?.q) sp.set("q", params.q);
  if (params?.page) sp.set("page", String(params.page));
  if (params?.start) sp.set("start", params.start);
  if (params?.end) sp.set("end", params.end);
  const qs = sp.toString();
  const base = "/api/v1/admin/subscriptions/payments/";
  return apiJson(qs ? `${base}?${qs}` : base);
}

export async function fetchAdminSubscriptionDetail(id: string): Promise<{
  subscription: AdminSubscriptionRow & {
    notes: string;
    payment_provider: string;
    payment_order_id: string;
    payment_transaction_id: string;
    deactivated_by: string;
    deactivated_reason: string;
    entitlements: Record<string, unknown>;
  };
  usage: AdminSubscriptionRow["usage"];
  events: AdminSubscriptionStats["recent_events"];
  payments: AdminSubscriptionPaymentRow[];
  referral_trial: {
    granted: boolean;
    ends_at: string | null;
    referral_count_at_grant: number | null;
  };
}> {
  return apiJson(`/api/v1/admin/subscriptions/${id}/`);
}

export async function adminDeactivateSubscription(
  id: string,
  reason?: string,
): Promise<unknown> {
  return apiJson(`/api/v1/admin/subscriptions/${id}/deactivate/`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "Admin deactivate" }),
  });
}

export async function adminActivateSubscription(
  id: string,
  extend_days?: number,
): Promise<unknown> {
  return apiJson(`/api/v1/admin/subscriptions/${id}/activate/`, {
    method: "POST",
    body: JSON.stringify(extend_days != null ? { extend_days } : {}),
  });
}

export async function adminGrantSubscription(body: {
  user_id: number;
  plan_code: string;
  days?: number;
  notes?: string;
}): Promise<unknown> {
  return apiJson("/api/v1/admin/subscriptions/grant/", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type AdminCardDeposit = {
  id: string;
  amount: number;
  status: string;
  transaction_ref: string;
  merchant_ref: string;
  receiving_card: {
    number: string;
    masked: string;
    cardholder: string;
    bank: string;
  };
  receipt_url: string;
  claimed_at: string | null;
  reviewed_at: string | null;
  review_note: string;
  expires_at: string;
  created_at: string;
  ledger_entry_id: string | null;
  user: {
    id: number;
    full_name: string;
    phone: string;
    email: string;
  };
  wallet_number: string;
  client_ip: string | null;
  user_agent: string;
  reviewed_by_admin_id: number | null;
  reviewed_by_admin_email: string;
};

function mapAdminCardDeposit(d: Record<string, any>, fallbackId?: string): AdminCardDeposit {
  return {
    id: String(d.id ?? fallbackId ?? ""),
    amount: toInt(d.amount, 0),
    status: String(d.status ?? ""),
    transaction_ref: String(d.transaction_ref ?? ""),
    merchant_ref: String(d.merchant_ref ?? ""),
    receiving_card: {
      number: String(d.receiving_card?.number ?? ""),
      masked: String(d.receiving_card?.masked ?? ""),
      cardholder: String(d.receiving_card?.cardholder ?? ""),
      bank: String(d.receiving_card?.bank ?? ""),
    },
    receipt_url: resolveMediaUrl(d.receipt_url) ?? String(d.receipt_url ?? ""),
    claimed_at: d.claimed_at ?? null,
    reviewed_at: d.reviewed_at ?? null,
    review_note: String(d.review_note ?? ""),
    expires_at: String(d.expires_at ?? ""),
    created_at: String(d.created_at ?? ""),
    ledger_entry_id: d.ledger_entry_id ? String(d.ledger_entry_id) : null,
    user: {
      id: toInt(d.user?.id, 0),
      full_name: String(d.user?.full_name ?? ""),
      phone: String(d.user?.phone ?? ""),
      email: String(d.user?.email ?? ""),
    },
    wallet_number: String(d.wallet_number ?? ""),
    client_ip: d.client_ip ?? null,
    user_agent: String(d.user_agent ?? ""),
    reviewed_by_admin_id: d.reviewed_by_admin_id != null ? toInt(d.reviewed_by_admin_id) : null,
    reviewed_by_admin_email: String(d.reviewed_by_admin_email ?? ""),
  };
}

export async function fetchAdminCardDeposits(params?: {
  status?: string;
  q?: string;
}): Promise<{ count: number; results: AdminCardDeposit[] }> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.q) sp.set("q", params.q);
  const qs = sp.toString();
  const raw = await apiJson<{
    count: number;
    results: Array<Record<string, any>>;
  }>(`/api/v1/admin/wallet/deposits/${qs ? `?${qs}` : ""}`);
  return {
    count: raw.count,
    results: (raw.results ?? []).map((d) => mapAdminCardDeposit(d)),
  };
}

export async function approveAdminCardDeposit(
  id: string,
  note?: string,
): Promise<{ deposit: AdminCardDeposit; balance: number }> {
  const raw = await apiJson<{ deposit: Record<string, any>; balance: string | number }>(
    `/api/v1/admin/wallet/deposits/${id}/approve/`,
    {
      method: "POST",
      body: JSON.stringify({ note: note || "" }),
    },
  );
  return {
    balance: toInt(raw.balance, 0),
    deposit: mapAdminCardDeposit(raw.deposit ?? {}, id),
  };
}

export async function rejectAdminCardDeposit(id: string, note?: string): Promise<unknown> {
  return apiJson(`/api/v1/admin/wallet/deposits/${id}/reject/`, {
    method: "POST",
    body: JSON.stringify({ note: note || "Rad etildi" }),
  });
}
