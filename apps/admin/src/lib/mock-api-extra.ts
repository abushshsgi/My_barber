// Mock API v2 — qo'shimcha entity CRUD operatsiyalari
import {
  mockAdmins,
  mockAuditLog,
  mockBroadcasts,
  mockCategories,
  mockFinanceSummary,
  mockPayouts,
  mockServices,
  mockTickets,
  mockTicketReplies,
  mockTransactions,
  type AdminBroadcast,
  type AdminPayout,
  type AdminService,
  type AdminTicket,
  type AdminTransaction,
  type PlatformAdmin,
  type ServiceCategory,
  type TicketReply,
  type TicketStatus,
} from "./mock-data-extra";
import {
  mockBarbers,
  mockBookings,
  mockReviews,
  mockSalons,
  mockUsers,
  type AdminBarber,
  type AdminBooking,
  type AdminSalon,
  type AdminUser,
  type BookingStatus,
} from "./mock-data";

const DELAY = 240;
function delay<T>(v: T): Promise<T> {
  return new Promise((r) => setTimeout(() => r(v), DELAY));
}

// --- Lookup by id ---
export async function getUserById(id: string): Promise<AdminUser | undefined> {
  return delay(mockUsers.find((u) => u.id === id));
}
export async function getBarberById(id: string): Promise<AdminBarber | undefined> {
  return delay(mockBarbers.find((b) => b.id === id));
}
export async function getSalonById(id: string): Promise<AdminSalon | undefined> {
  return delay(mockSalons.find((s) => s.id === id));
}
export async function getBookingById(id: string): Promise<AdminBooking | undefined> {
  return delay(mockBookings.find((b) => b.id === id));
}

export async function getBookingsByUser(userId: string): Promise<AdminBooking[]> {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return delay([]);
  return delay(mockBookings.filter((b) => b.client_name === user.name));
}
export async function getBookingsByBarber(barberId: string): Promise<AdminBooking[]> {
  const b = mockBarbers.find((x) => x.id === barberId);
  if (!b) return delay([]);
  return delay(mockBookings.filter((bk) => bk.barber_name === b.name));
}
export async function getReviewsByBarber(barberId: string) {
  const b = mockBarbers.find((x) => x.id === barberId);
  if (!b) return delay([]);
  return delay(mockReviews.filter((r) => r.barber_name === b.name));
}
export async function getBarbersBySalon(salonId: string): Promise<AdminBarber[]> {
  return delay(mockBarbers.filter((b) => b.salon_id === salonId));
}

// --- Generic patch helpers ---
export async function updateUser(id: string, body: Partial<AdminUser>): Promise<AdminUser> {
  const i = mockUsers.findIndex((u) => u.id === id);
  if (i < 0) throw new Error("Foydalanuvchi topilmadi");
  mockUsers[i] = { ...mockUsers[i], ...body };
  return delay(mockUsers[i]);
}
export async function updateBarber(id: string, body: Partial<AdminBarber>): Promise<AdminBarber> {
  const i = mockBarbers.findIndex((b) => b.id === id);
  if (i < 0) throw new Error("Sartarosh topilmadi");
  mockBarbers[i] = { ...mockBarbers[i], ...body };
  return delay(mockBarbers[i]);
}
export async function updateSalon(id: string, body: Partial<AdminSalon>): Promise<AdminSalon> {
  const i = mockSalons.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("Salon topilmadi");
  mockSalons[i] = { ...mockSalons[i], ...body };
  return delay(mockSalons[i]);
}
export async function updateBooking(
  id: string,
  body: Partial<Pick<AdminBooking, "status" | "price">>,
): Promise<AdminBooking> {
  const i = mockBookings.findIndex((b) => b.id === id);
  if (i < 0) throw new Error("Bron topilmadi");
  mockBookings[i] = { ...mockBookings[i], ...body };
  return delay(mockBookings[i]);
}

// --- Create new entities ---
function nextId(prefix: string, arr: { id: string }[]): string {
  return `${prefix}-${arr.length + 1}-${Date.now().toString(36).slice(-3)}`;
}

export async function createUser(
  body: Omit<AdminUser, "id" | "created_at" | "bookings_count">,
): Promise<AdminUser> {
  const u: AdminUser = {
    ...body,
    id: nextId("user", mockUsers),
    created_at: new Date().toISOString(),
    bookings_count: 0,
  };
  mockUsers.unshift(u);
  return delay(u);
}
export async function createBarber(
  body: Omit<AdminBarber, "id" | "created_at" | "rating" | "reviews_count" | "lat" | "lng">,
): Promise<AdminBarber> {
  const b: AdminBarber = {
    ...body,
    id: nextId("barber", mockBarbers),
    created_at: new Date().toISOString(),
    rating: 5,
    reviews_count: 0,
    lat: 41.3,
    lng: 69.24,
  };
  mockBarbers.unshift(b);
  return delay(b);
}
export async function createSalon(
  body: Omit<AdminSalon, "id" | "created_at" | "barbers_count" | "rating" | "lat" | "lng">,
): Promise<AdminSalon> {
  const s: AdminSalon = {
    ...body,
    id: nextId("salon", mockSalons),
    created_at: new Date().toISOString(),
    barbers_count: 0,
    rating: 5,
    lat: 41.3,
    lng: 69.24,
  };
  mockSalons.unshift(s);
  return delay(s);
}

// --- Services ---
export async function fetchServices(params?: {
  q?: string;
  category?: string;
}): Promise<AdminService[]> {
  const { q, category } = params ?? {};
  return delay(
    mockServices.filter(
      (s) =>
        (!q || s.name.toLowerCase().includes(q.toLowerCase())) &&
        (!category || category === "all" || s.category_id === category),
    ),
  );
}
export async function createService(
  body: Omit<AdminService, "id" | "category_name" | "bookings_count">,
): Promise<AdminService> {
  const cat = mockCategories.find((c) => c.id === body.category_id);
  const s: AdminService = {
    ...body,
    id: nextId("svc", mockServices),
    category_name: cat?.name ?? "",
    bookings_count: 0,
  };
  mockServices.unshift(s);
  return delay(s);
}
export async function updateService(
  id: string,
  body: Partial<AdminService>,
): Promise<AdminService> {
  const i = mockServices.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("Xizmat topilmadi");
  mockServices[i] = { ...mockServices[i], ...body };
  if (body.category_id) {
    const cat = mockCategories.find((c) => c.id === body.category_id);
    if (cat) mockServices[i].category_name = cat.name;
  }
  return delay(mockServices[i]);
}
export async function deleteService(id: string): Promise<void> {
  const i = mockServices.findIndex((s) => s.id === id);
  if (i < 0) throw new Error("Xizmat topilmadi");
  mockServices.splice(i, 1);
  return delay(undefined);
}

export async function fetchCategories(): Promise<ServiceCategory[]> {
  return delay(mockCategories);
}

// --- Tickets ---
export async function fetchTickets(params?: {
  status?: string;
  q?: string;
  priority?: string;
}): Promise<AdminTicket[]> {
  const { status, q, priority } = params ?? {};
  return delay(
    mockTickets.filter(
      (t) =>
        (!status || status === "all" || t.status === status) &&
        (!priority || priority === "all" || t.priority === priority) &&
        (!q ||
          t.subject.toLowerCase().includes(q.toLowerCase()) ||
          t.user_name.toLowerCase().includes(q.toLowerCase())),
    ),
  );
}
export async function getTicketById(id: string): Promise<AdminTicket | undefined> {
  return delay(mockTickets.find((t) => t.id === id));
}
export async function getTicketReplies(id: string): Promise<TicketReply[]> {
  return delay(mockTicketReplies.filter((r) => r.ticket_id === id));
}
export async function updateTicket(id: string, body: Partial<AdminTicket>): Promise<AdminTicket> {
  const i = mockTickets.findIndex((t) => t.id === id);
  if (i < 0) throw new Error("Murojaat topilmadi");
  mockTickets[i] = { ...mockTickets[i], ...body, updated_at: new Date().toISOString() };
  return delay(mockTickets[i]);
}
export async function postTicketReply(ticketId: string, body: string): Promise<TicketReply> {
  const r: TicketReply = {
    id: `rep-${ticketId}-${Date.now()}`,
    ticket_id: ticketId,
    author: "Admin Karimov",
    author_role: "admin",
    avatar: "https://i.pravatar.cc/150?img=12",
    body,
    created_at: new Date().toISOString(),
  };
  mockTicketReplies.push(r);
  // Auto-move to pending if open
  const t = mockTickets.find((x) => x.id === ticketId);
  if (t && t.status === "open") t.status = "pending";
  return delay(r);
}

// --- Finance ---
export async function fetchFinanceSummary() {
  return delay(mockFinanceSummary);
}
export async function fetchTransactions(params?: {
  type?: string;
  status?: string;
}): Promise<AdminTransaction[]> {
  const { type, status } = params ?? {};
  return delay(
    mockTransactions.filter(
      (t) =>
        (!type || type === "all" || t.type === type) &&
        (!status || status === "all" || t.status === status),
    ),
  );
}
export async function fetchPayouts(status?: string): Promise<AdminPayout[]> {
  return delay(mockPayouts.filter((p) => !status || status === "all" || p.status === status));
}
export async function markPayoutPaid(id: string): Promise<AdminPayout> {
  const i = mockPayouts.findIndex((p) => p.id === id);
  if (i < 0) throw new Error("To'lov topilmadi");
  mockPayouts[i] = { ...mockPayouts[i], status: "paid" };
  return delay(mockPayouts[i]);
}

// --- Broadcasts ---
export async function fetchBroadcasts(): Promise<AdminBroadcast[]> {
  return delay(mockBroadcasts);
}
export async function createBroadcast(
  body: Omit<AdminBroadcast, "id" | "sent_count" | "read_count" | "status" | "created_at">,
): Promise<AdminBroadcast> {
  const b: AdminBroadcast = {
    ...body,
    id: nextId("bc", mockBroadcasts),
    sent_count: Math.floor(Math.random() * 5000) + 1000,
    read_count: 0,
    status: "sent",
    created_at: new Date().toISOString(),
  };
  mockBroadcasts.unshift(b);
  return delay(b);
}

// --- Audit ---
export async function fetchAuditLog(params?: { q?: string; target?: string }) {
  const { q, target } = params ?? {};
  return delay(
    mockAuditLog.filter(
      (a) =>
        (!q ||
          a.target_name.toLowerCase().includes(q.toLowerCase()) ||
          a.admin.toLowerCase().includes(q.toLowerCase())) &&
        (!target || target === "all" || a.target_type === target),
    ),
  );
}

// --- Admins ---
export async function fetchAdmins(): Promise<PlatformAdmin[]> {
  return delay(mockAdmins);
}
export async function updateAdmin(
  id: string,
  body: Partial<PlatformAdmin>,
): Promise<PlatformAdmin> {
  const i = mockAdmins.findIndex((a) => a.id === id);
  if (i < 0) throw new Error("Admin topilmadi");
  mockAdmins[i] = { ...mockAdmins[i], ...body };
  return delay(mockAdmins[i]);
}

// re-export for convenience
export type {
  AdminService,
  ServiceCategory,
  AdminTicket,
  TicketReply,
  TicketStatus,
  AdminTransaction,
  AdminPayout,
  AdminBroadcast,
  PlatformAdmin,
};
export type { BookingStatus };
