// Mock data v2 — qo'shimcha entity'lar (Services, Tickets, Finance, Audit, Admins, Activity)
import { mockBarbers, mockBookings, mockUsers, REGIONS, type RegionCode } from "./mock-data";

// --- Categories & Services ---
export type ServiceCategory = {
  id: string;
  name: string;
  icon: string; // emoji
  order: number;
  services_count: number;
};

export const mockCategories: ServiceCategory[] = [
  { id: "cat-1", name: "Soch olish", icon: "✂️", order: 1, services_count: 6 },
  { id: "cat-2", name: "Soqol", icon: "🪒", order: 2, services_count: 4 },
  { id: "cat-3", name: "Bola xizmatlari", icon: "🧒", order: 3, services_count: 2 },
  { id: "cat-4", name: "Premium", icon: "👑", order: 4, services_count: 3 },
  { id: "cat-5", name: "Styling", icon: "💇", order: 5, services_count: 3 },
  { id: "cat-6", name: "Maxsus", icon: "✨", order: 6, services_count: 2 },
];

export type AdminService = {
  id: string;
  name: string;
  category_id: string;
  category_name: string;
  price: number;
  duration_min: number;
  is_active: boolean;
  bookings_count: number;
};

const SERVICE_DEFS: Array<[string, string, number, number]> = [
  ["Klassik soch olish", "cat-1", 80000, 30],
  ["Skin fade", "cat-1", 120000, 45],
  ["Buzz cut", "cat-1", 60000, 20],
  ["Texture cut", "cat-1", 110000, 40],
  ["Crop cut", "cat-1", 90000, 35],
  ["Mashinka soch", "cat-1", 50000, 20],
  ["Soqol shakli", "cat-2", 70000, 25],
  ["Issiq sochiq + soqol", "cat-2", 100000, 35],
  ["To'liq qirilgan soqol", "cat-2", 80000, 30],
  ["Mo'ylov tartiblash", "cat-2", 40000, 15],
  ["Bola soch olish", "cat-3", 60000, 25],
  ["Bola buzz cut", "cat-3", 45000, 20],
  ["Premium grooming", "cat-4", 250000, 90],
  ["Royal package", "cat-4", 350000, 120],
  ["Kuyov paketi", "cat-4", 450000, 150],
  ["Soch bo'yash", "cat-5", 180000, 60],
  ["Soch tiklash", "cat-5", 220000, 75],
  ["Hairspray styling", "cat-5", 50000, 15],
  ["Yuz tozalash", "cat-6", 150000, 50],
  ["Massaj", "cat-6", 130000, 45],
];

export const mockServices: AdminService[] = SERVICE_DEFS.map(([name, cat, price, dur], i) => ({
  id: `svc-${i + 1}`,
  name,
  category_id: cat,
  category_name: mockCategories.find((c) => c.id === cat)!.name,
  price,
  duration_min: dur,
  is_active: i % 11 !== 0,
  bookings_count: 20 + ((i * 17) % 400),
}));

// --- Support Tickets ---
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory = "bug" | "billing" | "account" | "feature" | "other";

export type AdminTicket = {
  id: string;
  subject: string;
  user_name: string;
  user_id: string;
  user_avatar: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  created_at: string;
  updated_at: string;
  assignee: string | null;
  unread: number;
};

export type TicketReply = {
  id: string;
  ticket_id: string;
  author: string;
  author_role: "user" | "admin";
  avatar: string;
  body: string;
  created_at: string;
};

const SUBJECTS = [
  "To'lov o'tmadi",
  "Hisobimga kira olmayapman",
  "Sartarosh kelmadi",
  "Bron bekor qilingan",
  "Ilova ishlamayapti",
  "Narxlar noto'g'ri",
  "Karta bog'lab bo'lmayapti",
  "Sharh qoldira olmayman",
  "Push xabarlar kelmayapti",
  "Salon manzili xato",
];

const PRIORITIES: TicketPriority[] = ["low", "normal", "normal", "high", "urgent"];
const STATUSES: TicketStatus[] = ["open", "open", "pending", "resolved", "closed"];
const CATEGORIES: TicketCategory[] = ["bug", "billing", "account", "feature", "other"];

function isoDaysAgo(d: number, h = 14): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(h, (d * 11) % 60, 0, 0);
  return date.toISOString();
}

export const mockTickets: AdminTicket[] = Array.from({ length: 24 }, (_, i) => {
  const u = mockUsers[i % mockUsers.length];
  return {
    id: `tk-${1000 + i}`,
    subject: SUBJECTS[i % SUBJECTS.length],
    user_name: u.name,
    user_id: u.id,
    user_avatar: `https://i.pravatar.cc/150?img=${(i + 5) % 70}`,
    status: STATUSES[i % STATUSES.length],
    priority: PRIORITIES[i % PRIORITIES.length],
    category: CATEGORIES[i % CATEGORIES.length],
    created_at: isoDaysAgo(i),
    updated_at: isoDaysAgo(Math.max(0, i - 1)),
    assignee: i % 3 === 0 ? null : "Admin Karimov",
    unread: i % 4 === 0 ? Math.floor((i % 5) + 1) : 0,
  };
});

export const mockTicketReplies: TicketReply[] = mockTickets.flatMap((t, i) => {
  const turns = 2 + (i % 4);
  return Array.from({ length: turns }, (_, j) => ({
    id: `rep-${t.id}-${j}`,
    ticket_id: t.id,
    author: j % 2 === 0 ? t.user_name : "Admin Karimov",
    author_role: (j % 2 === 0 ? "user" : "admin") as "user" | "admin",
    avatar: j % 2 === 0 ? t.user_avatar : "https://i.pravatar.cc/150?img=12",
    body:
      j % 2 === 0
        ? "Salom, muammo hali ham bor. Iltimos yordam bering."
        : "Salom! Tekshirib chiqyapmiz, tez orada javob beramiz.",
    created_at: isoDaysAgo(turns - j, 10 + j * 2),
  }));
});

// --- Finance: Transactions & Payouts ---
export type TxType = "booking" | "commission" | "payout" | "refund";
export type TxStatus = "pending" | "completed" | "failed";

export type AdminTransaction = {
  id: string;
  type: TxType;
  amount: number;
  status: TxStatus;
  related_id: string;
  related_name: string;
  created_at: string;
};

export const mockTransactions: AdminTransaction[] = Array.from({ length: 80 }, (_, i) => {
  const types: TxType[] = ["booking", "booking", "commission", "payout", "refund"];
  const statuses: TxStatus[] = ["completed", "completed", "completed", "pending", "failed"];
  const t = types[i % types.length];
  const booking = mockBookings[i % mockBookings.length];
  const barber = mockBarbers[i % mockBarbers.length];
  return {
    id: `tx-${20000 + i}`,
    type: t,
    amount:
      t === "commission"
        ? Math.floor(booking.price * 0.15)
        : t === "payout"
          ? Math.floor(booking.price * 0.85)
          : t === "refund"
            ? -booking.price
            : booking.price,
    status: statuses[i % statuses.length],
    related_id: t === "payout" ? barber.id : booking.id,
    related_name: t === "payout" ? barber.name : booking.client_name,
    created_at: isoDaysAgo(Math.floor(i / 4), 9 + (i % 12)),
  };
});

export type AdminPayout = {
  id: string;
  barber_id: string;
  barber_name: string;
  barber_avatar: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  period: string; // "2026-W17"
  created_at: string;
};

export const mockPayouts: AdminPayout[] = mockBarbers.slice(0, 30).map((b, i) => ({
  id: `po-${500 + i}`,
  barber_id: b.id,
  barber_name: b.name,
  barber_avatar: b.avatar,
  amount: 800000 + ((i * 73000) % 4_000_000),
  status: (["pending", "paid", "paid", "failed"] as const)[i % 4],
  period: `2026-W${15 + (i % 4)}`,
  created_at: isoDaysAgo(i, 11),
}));

// --- Broadcast / Notifications ---
export type BroadcastAudience = "all" | "users" | "barbers" | "region";
export type AdminBroadcast = {
  id: string;
  title: string;
  body: string;
  audience: BroadcastAudience;
  region?: RegionCode;
  channel: "push" | "sms" | "both";
  sent_count: number;
  read_count: number;
  status: "scheduled" | "sent" | "failed";
  created_at: string;
};

export const mockBroadcasts: AdminBroadcast[] = Array.from({ length: 12 }, (_, i) => ({
  id: `bc-${300 + i}`,
  title: [
    "Yangi salon ochildi!",
    "Hafta oxiri 20% chegirma",
    "Ilova yangilandi",
    "Sevimli sartaroshingiz qaytdi",
    "Yangi xizmat qo'shildi",
  ][i % 5],
  body: "Aziz mijoz, bizning maxsus taklifimizdan foydalaning.",
  audience: (["all", "users", "barbers", "region"] as const)[i % 4],
  region: i % 4 === 3 ? REGIONS[i % REGIONS.length].code : undefined,
  channel: (["push", "sms", "both"] as const)[i % 3],
  sent_count: 1500 + ((i * 423) % 8000),
  read_count: 800 + ((i * 311) % 5000),
  status: (["sent", "sent", "scheduled", "failed"] as const)[i % 4],
  created_at: isoDaysAgo(i * 2, 16),
}));

// --- Audit Log ---
export type AdminAuditEntry = {
  id: string;
  admin: string;
  admin_avatar: string;
  action: string;
  target_type: "user" | "barber" | "salon" | "booking" | "service" | "ticket" | "broadcast";
  target_id: string;
  target_name: string;
  ip: string;
  created_at: string;
};

const ACTIONS = [
  "Yangiladi",
  "O'chirdi",
  "Yaratdi",
  "Tasdiqladi",
  "Bloklash qildi",
  "Faollashtirdi",
];
const TARGETS: AdminAuditEntry["target_type"][] = [
  "user",
  "barber",
  "salon",
  "booking",
  "service",
  "ticket",
  "broadcast",
];

export const mockAuditLog: AdminAuditEntry[] = Array.from({ length: 60 }, (_, i) => ({
  id: `au-${4000 + i}`,
  admin: ["Admin Karimov", "Moderator Aliyev", "Finance Saidov"][i % 3],
  admin_avatar: `https://i.pravatar.cc/150?img=${12 + (i % 3) * 5}`,
  action: ACTIONS[i % ACTIONS.length],
  target_type: TARGETS[i % TARGETS.length],
  target_id: `id-${i + 100}`,
  target_name: [
    mockUsers[i % mockUsers.length].name,
    mockBarbers[i % mockBarbers.length].name,
    "Salon X",
  ][i % 3],
  ip: `185.${20 + (i % 200)}.${10 + (i % 240)}.${5 + (i % 240)}`,
  created_at: isoDaysAgo(Math.floor(i / 6), 8 + (i % 12)),
}));

// --- Admins ---
export type AdminRole = "superadmin" | "moderator" | "finance" | "support";
export type PlatformAdmin = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: AdminRole;
  is_active: boolean;
  last_login: string;
};

export const mockAdmins: PlatformAdmin[] = [
  {
    id: "ad-1",
    name: "Admin Karimov",
    email: "admin@shearhq.uz",
    avatar: "https://i.pravatar.cc/150?img=12",
    role: "superadmin",
    is_active: true,
    last_login: isoDaysAgo(0, 9),
  },
  {
    id: "ad-2",
    name: "Moderator Aliyev",
    email: "moderator@shearhq.uz",
    avatar: "https://i.pravatar.cc/150?img=17",
    role: "moderator",
    is_active: true,
    last_login: isoDaysAgo(0, 14),
  },
  {
    id: "ad-3",
    name: "Finance Saidov",
    email: "finance@shearhq.uz",
    avatar: "https://i.pravatar.cc/150?img=22",
    role: "finance",
    is_active: true,
    last_login: isoDaysAgo(1, 11),
  },
  {
    id: "ad-4",
    name: "Support Yusupov",
    email: "support@shearhq.uz",
    avatar: "https://i.pravatar.cc/150?img=27",
    role: "support",
    is_active: true,
    last_login: isoDaysAgo(0, 16),
  },
  {
    id: "ad-5",
    name: "Eski Admin",
    email: "old@shearhq.uz",
    avatar: "https://i.pravatar.cc/150?img=33",
    role: "moderator",
    is_active: false,
    last_login: isoDaysAgo(45, 10),
  },
];

// --- Activity feed (per entity) ---
export type ActivityEvent = {
  id: string;
  type: "booking" | "review" | "edit" | "signup" | "payout" | "ticket";
  text: string;
  created_at: string;
};

export function getActivityForUser(userId: string): ActivityEvent[] {
  const seed = userId.charCodeAt(userId.length - 1);
  return Array.from({ length: 8 }, (_, i) => ({
    id: `ev-${userId}-${i}`,
    type: (
      ["signup", "booking", "review", "booking", "edit", "ticket", "booking", "review"] as const
    )[i],
    text: [
      "Hisob yaratildi",
      "Yangi bron qildi",
      "5 yulduz baholash qoldirdi",
      "Bronni bekor qildi",
      "Profilni yangiladi",
      "Murojaat yubordi",
      "Yana bron qildi",
      "Sharh qoldirdi",
    ][i],
    created_at: isoDaysAgo((seed + i * 3) % 30, 9 + (i % 10)),
  }));
}

export function getActivityForBarber(barberId: string): ActivityEvent[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `ev-${barberId}-${i}`,
    type: (
      ["signup", "booking", "review", "edit", "payout", "booking", "review", "booking"] as const
    )[i],
    text: [
      "Sartarosh ro'yxatdan o'tdi",
      "Yangi bron qabul qildi",
      "Yangi sharh oldi (5★)",
      "Profil ma'lumotlarini yangiladi",
      "Haftalik to'lov o'tkazildi",
      "Yana bron qildi",
      "4★ sharh oldi",
      "Bron yakunladi",
    ][i],
    created_at: isoDaysAgo(i * 2, 10 + (i % 8)),
  }));
}

// --- Finance summary ---
export type FinanceSummary = {
  revenue_total: number;
  revenue_week: number;
  commission_total: number;
  pending_payouts: number;
  weekly: Array<{ day: string; revenue: number; commission: number }>;
  top_barbers: Array<{ id: string; name: string; avatar: string; revenue: number }>;
};

export const mockFinanceSummary: FinanceSummary = {
  revenue_total: 528_400_000,
  revenue_week: 42_750_000,
  commission_total: 79_260_000,
  pending_payouts: mockPayouts
    .filter((p) => p.status === "pending")
    .reduce((a, p) => a + p.amount, 0),
  weekly: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((day, i) => ({
    day,
    revenue: 4_500_000 + ((i * 871_000) % 3_500_000),
    commission: 670_000 + ((i * 113_000) % 500_000),
  })),
  top_barbers: mockBarbers.slice(0, 5).map((b, i) => ({
    id: b.id,
    name: b.name,
    avatar: b.avatar,
    revenue: 3_200_000 - i * 350_000,
  })),
};
