type PaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
};

export type ApiUser = {
  id: number;
  email: string;
  phone?: string | null;
  full_name?: string | null;
  role?: string;
  region?: string | null;
  avatar?: string | null;
  date_joined?: string;
};

export type AuthResponse = {
  access: string;
  refresh: string;
  user: ApiUser;
};

export type RegionOption = {
  value: string;
  label: string;
};

export type SalonListApi = {
  id: number;
  name: string;
  slug?: string;
  cover_image?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  address?: string;
  premium?: boolean;
  is_published?: boolean;
  rating_avg?: number | string | null;
  review_count?: number | null;
};

export type SalonDetailApi = SalonListApi & {
  description?: string;
  phone?: string;
  languages?: string[];
  closed_weekdays?: number[];
  hours?: { weekday: number; open_time: string; close_time: string }[];
  images?: { id: number; image: string; sort_order: number }[];
  services?: ApiSalonService[];
  created_at?: string;
};

export type ApiSalonService = {
  id: number;
  barber?: number | null;
  catalog_service?: number | null;
  name: string;
  price: string | number;
  duration_minutes: number;
  image_url?: string;
};

export type ApiSalonStaff = {
  id: number;
  full_name: string;
  avatar?: string | null;
  role?: string;
  experience_years?: number | null;
};

export type ApiReview = {
  id: number;
  booking: number;
  author_name: string;
  rating: number;
  text: string;
  photo?: string | null;
  barber_reply?: string;
  barber_replied_at?: string | null;
  created_at: string;
};

export type ApiBooking = {
  id: number;
  customer: number;
  customer_name: string;
  customer_phone?: string;
  customer_avatar?: string;
  salon: number | null;
  salon_name: string | null;
  barber: number;
  barber_name: string;
  start_at: string;
  end_at: string;
  started_at?: string | null;
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
  total_price: string | number;
  lines: {
    id: number;
    service?: number | null;
    barber_service?: number | null;
    service_name: string;
    price: string | number;
    duration_minutes: number;
  }[];
  has_review?: boolean;
  review_id?: number | null;
  created_at: string;
};

export type AvailabilityResponse = {
  slots: string[];
  total_minutes?: number;
  closed_reason?: string;
};

export type FavoriteSalonRow = {
  id: number;
  salon: number;
  created_at: string;
};

export type ApiNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

const USER_ACCESS_KEY = "mybarber_user_access";
const USER_REFRESH_KEY = "mybarber_user_refresh";
const LEGACY_ACCESS_KEY = "mybarber_access";
const LEGACY_REFRESH_KEY = "mybarber_refresh";

function readEnv(name: string): string | undefined {
  return (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
}

function normalizeBase(raw: string): string {
  if (!raw.trim()) return "";
  try {
    const url = new URL(raw);
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    ) {
      url.protocol = "https:";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

const ENV_API_BASE = readEnv("VITE_API_URL") || readEnv("NEXT_PUBLIC_API_URL") || "";
const API_BASE = normalizeBase(ENV_API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : ""));

function absolutePath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

function tokenPayloadType(token: string | null): "user" | "barber" | "admin" | null {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as { type?: string };
    if (parsed.type?.startsWith("barber_")) return "barber";
    if (parsed.type?.startsWith("admin_")) return "admin";
    return "user";
  } catch {
    return null;
  }
}

export function getUserAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(USER_ACCESS_KEY);
  if (token) return token;
  const legacy = localStorage.getItem(LEGACY_ACCESS_KEY);
  return tokenPayloadType(legacy) === "user" ? legacy : null;
}

function getUserRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(USER_REFRESH_KEY);
  if (token) return token;
  const legacy = localStorage.getItem(LEGACY_REFRESH_KEY);
  return tokenPayloadType(legacy) === "user" ? legacy : null;
}

export function setUserTokens(access: string, refresh: string): void {
  localStorage.setItem(USER_ACCESS_KEY, access);
  localStorage.setItem(USER_REFRESH_KEY, refresh);
  localStorage.setItem(LEGACY_ACCESS_KEY, access);
  localStorage.setItem(LEGACY_REFRESH_KEY, refresh);
}

export function clearUserTokens(): void {
  localStorage.removeItem(USER_ACCESS_KEY);
  localStorage.removeItem(USER_REFRESH_KEY);
  localStorage.removeItem(LEGACY_ACCESS_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function formatError(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;
  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    const detail = data.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    const first = Object.values(data).find(Boolean);
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return fallback;
}

async function refreshAccess(): Promise<string | null> {
  const refresh = getUserRefreshToken();
  if (!refresh) return null;
  const res = await fetch(absolutePath("/api/v1/auth/token/refresh/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearUserTokens();
    return null;
  }
  const body = (await parseBody(res)) as { access?: string; refresh?: string } | null;
  if (!body?.access) {
    clearUserTokens();
    return null;
  }
  setUserTokens(body.access, body.refresh || refresh);
  return body.access;
}

async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getUserAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(absolutePath(path), { ...options, headers });
  if (res.status === 401 && retry && token) {
    const next = await refreshAccess();
    if (next) {
      headers.set("Authorization", `Bearer ${next}`);
      res = await fetch(absolutePath(path), { ...options, headers });
    }
  }
  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}, fallback = "So'rov bajarilmadi."): Promise<T> {
  const res = await apiFetch(path, options);
  const body = await parseBody(res);
  if (!res.ok) throw new Error(formatError(body, fallback));
  return body as T;
}

function unwrapList<T>(body: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(body)) return body;
  return Array.isArray(body.results) ? body.results : [];
}

export async function apiList<T>(path: string, fallback?: string): Promise<T[]> {
  return unwrapList(await apiJson<T[] | PaginatedResponse<T>>(path, {}, fallback));
}

export function getApiBase(): string {
  return API_BASE || "same-origin";
}

export function loginUser(email: string, password: string): Promise<AuthResponse> {
  return apiJson<AuthResponse>(
    "/api/v1/auth/token/",
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    },
    "Email yoki parol noto'g'ri.",
  );
}

export function registerUser(input: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  region?: string;
}): Promise<ApiUser> {
  return apiJson<ApiUser>(
    "/api/v1/auth/register/",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        full_name: input.full_name.trim(),
        phone: input.phone?.trim() || undefined,
        region: input.region || undefined,
      }),
    },
    "Ro'yxatdan o'tishda xatolik.",
  );
}

export function fetchRegions(): Promise<RegionOption[]> {
  return apiList<RegionOption>("/api/v1/regions/", "Hududlar yuklanmadi.");
}

export function fetchMe(): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/", {}, "Profil yuklanmadi.");
}

export function updateMe(data: Partial<Pick<ApiUser, "email" | "phone" | "full_name" | "region">>): Promise<ApiUser> {
  return apiJson<ApiUser>(
    "/api/v1/users/me/",
    { method: "PATCH", body: JSON.stringify(data) },
    "Profil yangilanmadi.",
  );
}

export function fetchSalons(query?: string): Promise<SalonListApi[]> {
  const q = query?.trim();
  if (q) return apiList<SalonListApi>(`/api/v1/salons/search/?q=${encodeURIComponent(q)}`, "Salon qidiruvda xatolik.");
  return apiList<SalonListApi>("/api/v1/salons/", "Salonlar yuklanmadi.");
}

export function fetchSalonBatch(ids: string[]): Promise<SalonListApi[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return apiList<SalonListApi>(`/api/v1/salons/?ids=${encodeURIComponent(ids.join(","))}`, "Sevimli salonlar yuklanmadi.");
}

export function fetchSalonDetail(id: string): Promise<SalonDetailApi> {
  return apiJson<SalonDetailApi>(`/api/v1/salons/${encodeURIComponent(id)}/`, {}, "Salon topilmadi.");
}

export function fetchSalonStaff(id: string): Promise<ApiSalonStaff[]> {
  return apiList<ApiSalonStaff>(`/api/v1/salons/${encodeURIComponent(id)}/staff/`, "Ustalar yuklanmadi.");
}

export function fetchSalonReviews(id: string): Promise<ApiReview[]> {
  return apiList<ApiReview>(`/api/v1/reviews/?salon=${encodeURIComponent(id)}`, "Sharhlar yuklanmadi.");
}

export function fetchSalonPortfolio(id: string): Promise<{ image: string | null; booking_id: number }[]> {
  return apiList<{ image: string | null; booking_id: number }>(`/api/v1/salons/${encodeURIComponent(id)}/portfolio/`, "Portfolio yuklanmadi.");
}

export function fetchBookings(): Promise<ApiBooking[]> {
  return apiList<ApiBooking>("/api/v1/bookings/", "Bronlar yuklanmadi.");
}

export function cancelBooking(id: string): Promise<ApiBooking> {
  return apiJson<ApiBooking>(`/api/v1/bookings/${encodeURIComponent(id)}/cancel/`, { method: "POST" }, "Bron bekor qilinmadi.");
}

export function fetchBookingAvailability(input: {
  salon: string;
  barber: string;
  date: string;
  serviceIds: string[];
}): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({
    salon: input.salon,
    barber: input.barber,
    date: input.date,
    service_ids: input.serviceIds.join(","),
  });
  return apiJson<AvailabilityResponse>(`/api/v1/bookings/availability/?${params.toString()}`, {}, "Bo'sh vaqtlar yuklanmadi.");
}

export function createBooking(input: {
  salon: string;
  barber: string;
  startAt: string;
  serviceIds: string[];
}): Promise<ApiBooking> {
  return apiJson<ApiBooking>(
    "/api/v1/bookings/",
    {
      method: "POST",
      body: JSON.stringify({
        salon: Number(input.salon),
        barber: Number(input.barber),
        start_at: input.startAt,
        service_ids: input.serviceIds.map(Number),
      }),
    },
    "Bron yaratilmadi.",
  );
}

export function fetchFavoriteSalons(): Promise<FavoriteSalonRow[]> {
  if (!getUserAccessToken()) return Promise.resolve([]);
  return apiJson<PaginatedResponse<FavoriteSalonRow>>("/api/v1/favorites/salons/", {}, "Sevimlilar yuklanmadi.").then((body) =>
    unwrapList(body),
  );
}

export function addFavoriteSalon(salonId: string): Promise<FavoriteSalonRow> {
  return apiJson<FavoriteSalonRow>(
    "/api/v1/favorites/salons/",
    { method: "POST", body: JSON.stringify({ salon: Number(salonId) }) },
    "Sevimliga qo'shilmadi.",
  );
}

export async function removeFavoriteSalon(salonId: string): Promise<void> {
  await apiJson<null>(
    `/api/v1/favorites/salons/${encodeURIComponent(salonId)}/`,
    { method: "DELETE" },
    "Sevimlidan olib tashlanmadi.",
  );
}

export function fetchNotifications(): Promise<ApiNotification[]> {
  if (!getUserAccessToken()) return Promise.resolve([]);
  return apiList<ApiNotification>("/api/v1/notifications/", "Bildirishnomalar yuklanmadi.");
}

export function markNotificationRead(id: string): Promise<ApiNotification> {
  return apiJson<ApiNotification>(`/api/v1/notifications/${encodeURIComponent(id)}/read/`, { method: "POST" });
}

export function markAllNotificationsRead(): Promise<{ status?: string }> {
  return apiJson<{ status?: string }>("/api/v1/notifications/mark-all-read/", { method: "POST" });
}
