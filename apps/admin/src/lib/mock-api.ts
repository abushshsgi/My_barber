// Mock API — mock data ustidan in-memory mutatsiya bilan ishlaydigan funksiyalar
import {
  mockBarbers,
  mockBookings,
  mockReviews,
  mockSalons,
  mockStats,
  mockUsers,
  type AdminBarber,
  type AdminBooking,
  type AdminReview,
  type AdminSalon,
  type AdminStats,
  type AdminUser,
  type RegionCode,
} from "./mock-data";

const DELAY = 280;

function delay<T>(value: T): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), DELAY));
}

export const PAGE_SIZE = 10;

export type Paginated<T> = {
  results: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
};

function paginate<T>(items: T[], page: number): Paginated<T> {
  const start = (page - 1) * PAGE_SIZE;
  return {
    results: items.slice(start, start + PAGE_SIZE),
    count: items.length,
    page,
    page_size: PAGE_SIZE,
    total_pages: Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
  };
}

function matchQ(value: string, q?: string): boolean {
  if (!q) return true;
  return value.toLowerCase().includes(q.toLowerCase());
}

// In-memory mutable copies (so mutations actually affect data)
const usersStore = [...mockUsers];
const barbersStore = [...mockBarbers];
const salonsStore = [...mockSalons];

// --- STATS ---
export async function fetchAdminStats(): Promise<AdminStats> {
  return delay(mockStats);
}

// --- USERS ---
export async function fetchAdminUsers(params?: {
  q?: string;
  region?: RegionCode | "";
  page?: number;
}): Promise<Paginated<AdminUser>> {
  const { q, region, page = 1 } = params ?? {};
  const filtered = usersStore.filter(
    (u) =>
      (matchQ(u.name, q) || matchQ(u.phone, q) || matchQ(u.email, q)) &&
      (!region || u.region === region),
  );
  return delay(paginate(filtered, page));
}

export async function patchAdminUser(
  id: string,
  body: Partial<Pick<AdminUser, "is_active" | "region">>,
): Promise<AdminUser> {
  const idx = usersStore.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("Foydalanuvchi topilmadi");
  usersStore[idx] = { ...usersStore[idx], ...body };
  return delay(usersStore[idx]);
}

// --- BARBERS ---
export async function fetchAdminBarbers(params?: {
  q?: string;
  region?: RegionCode | "";
  page?: number;
}): Promise<Paginated<AdminBarber>> {
  const { q, region, page = 1 } = params ?? {};
  const filtered = barbersStore.filter(
    (b) => (matchQ(b.name, q) || matchQ(b.phone, q)) && (!region || b.region === region),
  );
  return delay(paginate(filtered, page));
}

export async function patchAdminBarber(
  id: string,
  body: Partial<Pick<AdminBarber, "is_active" | "region">>,
): Promise<AdminBarber> {
  const idx = barbersStore.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Sartarosh topilmadi");
  barbersStore[idx] = { ...barbersStore[idx], ...body };
  return delay(barbersStore[idx]);
}

export async function deleteAdminBarber(id: string): Promise<{ ok: true }> {
  const idx = barbersStore.findIndex((b) => b.id === id);
  if (idx < 0) throw new Error("Sartarosh topilmadi");
  barbersStore.splice(idx, 1);
  return delay({ ok: true as const });
}

// --- SALONS ---
export async function fetchAdminSalons(params?: {
  q?: string;
  region?: RegionCode | "";
  published?: boolean | "all";
  page?: number;
}): Promise<Paginated<AdminSalon>> {
  const { q, region, published = "all", page = 1 } = params ?? {};
  const filtered = salonsStore.filter(
    (s) =>
      matchQ(s.name, q) &&
      (!region || s.region === region) &&
      (published === "all" || s.published === published),
  );
  return delay(paginate(filtered, page));
}

export async function patchAdminSalon(
  id: string,
  body: Partial<Pick<AdminSalon, "published">>,
): Promise<AdminSalon> {
  const idx = salonsStore.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Salon topilmadi");
  salonsStore[idx] = { ...salonsStore[idx], ...body };
  return delay(salonsStore[idx]);
}

export async function deleteAdminSalon(id: string): Promise<{ ok: true }> {
  const idx = salonsStore.findIndex((s) => s.id === id);
  if (idx < 0) throw new Error("Salon topilmadi");
  salonsStore.splice(idx, 1);
  return delay({ ok: true as const });
}

// --- BOOKINGS ---
export async function fetchAdminBookings(params?: {
  status?: string;
  region?: RegionCode | "";
}): Promise<AdminBooking[]> {
  const { status, region } = params ?? {};
  const filtered = mockBookings.filter(
    (b) => (!status || status === "all" || b.status === status) && (!region || b.region === region),
  );
  return delay(filtered);
}

// --- REVIEWS ---
export async function fetchAdminReviews(params?: {
  barber?: string;
  min_rating?: number;
}): Promise<AdminReview[]> {
  const { barber, min_rating = 0 } = params ?? {};
  const filtered = mockReviews.filter(
    (r) => (!barber || matchQ(r.barber_name, barber)) && r.rating >= min_rating,
  );
  return delay(filtered);
}

// For map: fetch ALL (no pagination)
export async function fetchAllSalonsForMap(region?: RegionCode | ""): Promise<AdminSalon[]> {
  return delay(salonsStore.filter((s) => !region || s.region === region));
}

export async function fetchAllBarbersForMap(region?: RegionCode | ""): Promise<AdminBarber[]> {
  return delay(barbersStore.filter((b) => !region || b.region === region));
}
