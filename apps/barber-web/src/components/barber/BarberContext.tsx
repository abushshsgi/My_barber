import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch, apiJson, clearBarberTokens } from "@/lib/api";

export type ViewMode = "independent" | "salon";

export type BarberProfile = {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
};

export type Service = {
  id: string;
  name: string;
  duration_min: number;
  price: number;
  is_active: boolean;
};

export type WorkingHour = {
  weekday: number; // 0..6
  open: string;
  close: string;
  closed: boolean;
};

export type Booking = {
  id: string;
  client: string;
  client_avatar: string;
  service: string;
  date: string; // "Today" | "Tomorrow" | "DD MMM"
  time: string;
  duration_min: number;
  price: number;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
};

export type Client = {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  visits: number;
  last_visit: string;
  spent: number;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  kind: "booking" | "review" | "system" | "chat";
};

export type ChatMessage = {
  id: string;
  sender_kind: "BARBER" | "CLIENT";
  text: string;
  time: string;
};

export type Conversation = {
  id: string;
  client: string;
  avatar: string;
  preview: string;
  time: string;
  unread: number;
  messages: ChatMessage[];
};

export type Review = {
  id: string;
  client: string;
  avatar: string;
  rating: number;
  text: string;
  date: string;
  service: string;
};

export type Salon = {
  id: string;
  name: string;
  address: string;
  cover: string;
  rating: number;
  reviews_count: number;
  members: number;
  gallery: string[];
};

export type Transaction = {
  id: string;
  date: string;
  client: string;
  service: string;
  amount: number;
  kind: "booking" | "tip" | "payout" | "refund";
  status: "completed" | "pending" | "failed";
};

export type Promo = {
  id: string;
  code: string;
  description: string;
  discount_pct: number;
  uses: number;
  max_uses: number;
  is_active: boolean;
  expires: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: "tool" | "product" | "consumable";
  stock: number;
  min_stock: number;
  unit: string;
  price: number;
  supplier?: string;
};

export type Expense = {
  id: string;
  date: string;
  category: "rent" | "supplies" | "marketing" | "utility" | "salary" | "other";
  description: string;
  amount: number;
};

export type PortfolioItem = {
  id: string;
  image: string;
  title: string;
  service: string;
  date: string;
  likes: number;
};

export type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  done: boolean;
};

export type Settings = {
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_sms: boolean;
  auto_accept: boolean;
  language: "uz" | "ru" | "en";
  theme: "light" | "dark";
};

type Ctx = {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  hasSalon: boolean;
  onboardingComplete: boolean;
  profile: BarberProfile;
  services: Service[];
  workingHours: WorkingHour[];
  bookings: Booking[];
  clients: Client[];
  notifications: Notification[];
  conversations: Conversation[];
  reviews: Review[];
  salon: Salon;
  transactions: Transaction[];
  promos: Promo[];
  inventory: InventoryItem[];
  expenses: Expense[];
  portfolio: PortfolioItem[];
  goals: Goal[];
  settings: Settings;
  startBooking: (id: string) => void;
  completeBooking: (id: string) => void;
  cancelBooking: (id: string) => void;
  acceptBooking: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  sendChatMessage: (conversationId: string, text: string) => void;
  loadConversationMessages: (conversationId: string) => Promise<void>;
  toggleService: (id: string) => void;
  togglePromo: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  adjustInventory: (id: string, delta: number) => void;
  addExpense: (e: Omit<Expense, "id">) => void;
  toggleGoal: (id: string) => void;
};

const BarberCtx = createContext<Ctx | null>(null);

const PROFILE: BarberProfile = {
  id: "b-001",
  name: "Jasur Karimov",
  title: "Senior Barber",
  email: "jasur@shearhq.uz",
  phone: "+998 90 123 45 67",
  avatar: "https://i.pravatar.cc/150?img=12",
  bio: "10+ yillik tajribaga ega sartarosh. Klassik va zamonaviy soch turmaklash.",
};

const SERVICES_INIT: Service[] = [
  { id: "s1", name: "Klassik soch turmaklash", duration_min: 45, price: 80000, is_active: true },
  { id: "s2", name: "Soqol olish va parvarish", duration_min: 30, price: 50000, is_active: true },
  { id: "s3", name: "Bola sochi", duration_min: 30, price: 40000, is_active: true },
  { id: "s4", name: "Royal package", duration_min: 90, price: 200000, is_active: false },
];

const WORKING_HOURS: WorkingHour[] = [
  { weekday: 0, open: "10:00", close: "18:00", closed: false },
  { weekday: 1, open: "09:00", close: "20:00", closed: false },
  { weekday: 2, open: "09:00", close: "20:00", closed: false },
  { weekday: 3, open: "09:00", close: "20:00", closed: false },
  { weekday: 4, open: "09:00", close: "20:00", closed: false },
  { weekday: 5, open: "09:00", close: "21:00", closed: false },
  { weekday: 6, open: "10:00", close: "16:00", closed: true },
];

const BOOKINGS_INIT: Booking[] = [
  {
    id: "bk1",
    client: "Sherzod A.",
    client_avatar: "https://i.pravatar.cc/150?img=14",
    service: "Klassik soch turmaklash",
    date: "Today",
    time: "10:30",
    duration_min: 45,
    price: 80000,
    status: "in_progress",
  },
  {
    id: "bk2",
    client: "Diyor R.",
    client_avatar: "https://i.pravatar.cc/150?img=15",
    service: "Soqol olish",
    date: "Today",
    time: "12:00",
    duration_min: 30,
    price: 50000,
    status: "accepted",
  },
  {
    id: "bk3",
    client: "Bekzod K.",
    client_avatar: "https://i.pravatar.cc/150?img=16",
    service: "Royal package",
    date: "Today",
    time: "14:00",
    duration_min: 90,
    price: 200000,
    status: "accepted",
  },
  {
    id: "bk4",
    client: "Abdulla M.",
    client_avatar: "https://i.pravatar.cc/150?img=17",
    service: "Klassik soch turmaklash",
    date: "Today",
    time: "09:00",
    duration_min: 45,
    price: 80000,
    status: "completed",
  },
  {
    id: "bk5",
    client: "Otabek S.",
    client_avatar: "https://i.pravatar.cc/150?img=18",
    service: "Bola sochi",
    date: "Tomorrow",
    time: "11:00",
    duration_min: 30,
    price: 40000,
    status: "accepted",
  },
  {
    id: "bk6",
    client: "Anvar T.",
    client_avatar: "https://i.pravatar.cc/150?img=19",
    service: "Soqol olish",
    date: "28 Apr",
    time: "15:30",
    duration_min: 30,
    price: 50000,
    status: "completed",
  },
];

const CLIENTS: Client[] = [
  {
    id: "c1",
    name: "Sherzod Abdullayev",
    avatar: "https://i.pravatar.cc/150?img=14",
    phone: "+998 90 111 22 33",
    visits: 12,
    last_visit: "Today",
    spent: 960000,
  },
  {
    id: "c2",
    name: "Diyor Rahimov",
    avatar: "https://i.pravatar.cc/150?img=15",
    phone: "+998 91 222 33 44",
    visits: 8,
    last_visit: "Today",
    spent: 400000,
  },
  {
    id: "c3",
    name: "Bekzod Karimov",
    avatar: "https://i.pravatar.cc/150?img=16",
    phone: "+998 93 333 44 55",
    visits: 5,
    last_visit: "Yesterday",
    spent: 1000000,
  },
  {
    id: "c4",
    name: "Abdulla Murodov",
    avatar: "https://i.pravatar.cc/150?img=17",
    phone: "+998 94 444 55 66",
    visits: 20,
    last_visit: "Today",
    spent: 1600000,
  },
  {
    id: "c5",
    name: "Otabek Saidov",
    avatar: "https://i.pravatar.cc/150?img=18",
    phone: "+998 97 555 66 77",
    visits: 3,
    last_visit: "1 hafta",
    spent: 120000,
  },
];

const NOTIFICATIONS_INIT: Notification[] = [
  {
    id: "n1",
    title: "Yangi bron",
    body: "Sherzod Abdullayev sizga 10:30 ga bron qildi.",
    time: "5 daqiqa oldin",
    read: false,
    kind: "booking",
  },
  {
    id: "n2",
    title: "Yangi sharh",
    body: "Diyor R. sizga 5 yulduz qoldirdi.",
    time: "1 soat oldin",
    read: false,
    kind: "review",
  },
  {
    id: "n3",
    title: "To'lov qabul qilindi",
    body: "Haftalik daromad hisobingizga o'tkazildi.",
    time: "Kecha",
    read: true,
    kind: "system",
  },
  {
    id: "n4",
    title: "Yangi xabar",
    body: "Bekzod K.: 'Salom, sizda joy bormi?'",
    time: "2 kun oldin",
    read: true,
    kind: "chat",
  },
];

const CONVERSATIONS_INIT: Conversation[] = [
  {
    id: "cv1",
    client: "Sherzod Abdullayev",
    avatar: "https://i.pravatar.cc/150?img=14",
    preview: "Rahmat, ertaga keyaman.",
    time: "10:24",
    unread: 0,
    messages: [
      { id: "m1", sender_kind: "CLIENT", text: "Salom, ertaga 11:00 ga bron qila olamanmi?", time: "10:20" },
      { id: "m2", sender_kind: "BARBER", text: "Salom! Albatta, sizni kutaman.", time: "10:22" },
      { id: "m3", sender_kind: "CLIENT", text: "Rahmat, ertaga keyaman.", time: "10:24" },
    ],
  },
  {
    id: "cv2",
    client: "Bekzod Karimov",
    avatar: "https://i.pravatar.cc/150?img=16",
    preview: "Royal package ichida nima bor?",
    time: "Kecha",
    unread: 2,
    messages: [
      { id: "m4", sender_kind: "CLIENT", text: "Salom, sizda joy bormi?", time: "Kecha 18:30" },
      { id: "m5", sender_kind: "CLIENT", text: "Royal package ichida nima bor?", time: "Kecha 18:31" },
    ],
  },
  {
    id: "cv3",
    client: "Otabek Saidov",
    avatar: "https://i.pravatar.cc/150?img=18",
    preview: "Vaqt o'zgardi.",
    time: "2 kun",
    unread: 0,
    messages: [
      { id: "m6", sender_kind: "BARBER", text: "Salom Otabek, vaqtingiz 15:00 ga ko'chirildi.", time: "2 kun" },
      { id: "m7", sender_kind: "CLIENT", text: "Vaqt o'zgardi.", time: "2 kun" },
    ],
  },
];

const REVIEWS: Review[] = [
  {
    id: "r1",
    client: "Sherzod A.",
    avatar: "https://i.pravatar.cc/150?img=14",
    rating: 5,
    text: "Eng zo'r usta! Hamisha ozoda va o'z vaqtida.",
    date: "2 kun oldin",
    service: "Klassik soch turmaklash",
  },
  {
    id: "r2",
    client: "Diyor R.",
    avatar: "https://i.pravatar.cc/150?img=15",
    rating: 5,
    text: "Soqolni juda chiroyli oldi, tavsiya qilaman.",
    date: "1 hafta oldin",
    service: "Soqol olish",
  },
  {
    id: "r3",
    client: "Bekzod K.",
    avatar: "https://i.pravatar.cc/150?img=16",
    rating: 4,
    text: "Yaxshi, lekin biroz kutdim.",
    date: "2 hafta oldin",
    service: "Royal package",
  },
  {
    id: "r4",
    client: "Abdulla M.",
    avatar: "https://i.pravatar.cc/150?img=17",
    rating: 5,
    text: "Doim shu yerga keladi oilam.",
    date: "1 oy oldin",
    service: "Bola sochi",
  },
];

const SALON: Salon = {
  id: "sl1",
  name: "Royal Cuts Studio",
  address: "Toshkent sh., Yunusobod tumani, A. Temur ko'chasi 21",
  cover:
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80",
  rating: 4.8,
  reviews_count: 248,
  members: 6,
  gallery: [
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=80",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&q=80",
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=80",
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80",
    "https://images.unsplash.com/photo-1593702288056-f173a3a4c0a4?w=800&q=80",
  ],
};

const TRANSACTIONS_INIT: Transaction[] = [
  { id: "t1", date: "Bugun, 10:30", client: "Sherzod A.", service: "Klassik", amount: 80000, kind: "booking", status: "completed" },
  { id: "t2", date: "Bugun, 09:15", client: "Abdulla M.", service: "Klassik", amount: 80000, kind: "booking", status: "completed" },
  { id: "t3", date: "Bugun, 09:20", client: "Abdulla M.", service: "Tip", amount: 20000, kind: "tip", status: "completed" },
  { id: "t4", date: "Kecha, 17:45", client: "Anvar T.", service: "Soqol", amount: 50000, kind: "booking", status: "completed" },
  { id: "t5", date: "Kecha, 12:00", client: "—", service: "Haftalik to'lov", amount: -450000, kind: "payout", status: "completed" },
  { id: "t6", date: "2 kun oldin", client: "Diyor R.", service: "Royal", amount: 200000, kind: "booking", status: "pending" },
  { id: "t7", date: "3 kun oldin", client: "Otabek S.", service: "Bola sochi", amount: 40000, kind: "refund", status: "failed" },
];

const INVENTORY_INIT: InventoryItem[] = [
  { id: "i1", name: "Soch yog'i (Pomade)", category: "product", stock: 8, min_stock: 5, unit: "dona", price: 120000, supplier: "BarberPro" },
  { id: "i2", name: "Soqol yuvgich shampuni", category: "product", stock: 3, min_stock: 5, unit: "dona", price: 90000, supplier: "BarberPro" },
  { id: "i3", name: "Bir martalik ustara", category: "consumable", stock: 45, min_stock: 20, unit: "dona", price: 5000, supplier: "MedSupply" },
  { id: "i4", name: "Sochiq", category: "consumable", stock: 24, min_stock: 10, unit: "dona", price: 15000 },
  { id: "i5", name: "Mashinka tig'i (#2)", category: "tool", stock: 2, min_stock: 3, unit: "dona", price: 60000, supplier: "Wahl UZ" },
  { id: "i6", name: "Talc kukuni", category: "consumable", stock: 12, min_stock: 5, unit: "dona", price: 25000 },
];

const EXPENSES_INIT: Expense[] = [
  { id: "e1", date: "Bugun", category: "supplies", description: "Pomade va shampun", amount: 360000 },
  { id: "e2", date: "Kecha", category: "marketing", description: "Instagram reklama", amount: 150000 },
  { id: "e3", date: "1 Apr", category: "rent", description: "Aprel oyi ijara", amount: 2500000 },
  { id: "e4", date: "5 Apr", category: "utility", description: "Elektr va internet", amount: 280000 },
  { id: "e5", date: "10 Apr", category: "supplies", description: "Bir martalik ustaralar", amount: 100000 },
];

const PORTFOLIO_INIT: PortfolioItem[] = [
  { id: "pf1", image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80", title: "Klassik Fade", service: "Klassik soch turmaklash", date: "2 kun oldin", likes: 24 },
  { id: "pf2", image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80", title: "Pompadour", service: "Royal package", date: "1 hafta oldin", likes: 41 },
  { id: "pf3", image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80", title: "Soqol parvarish", service: "Soqol olish", date: "1 hafta oldin", likes: 18 },
  { id: "pf4", image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80", title: "Modern Crop", service: "Klassik soch turmaklash", date: "2 hafta", likes: 32 },
  { id: "pf5", image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80", title: "Buzz Cut", service: "Klassik soch turmaklash", date: "3 hafta", likes: 15 },
  { id: "pf6", image: "https://images.unsplash.com/photo-1593702288056-f173a3a4c0a4?w=600&q=80", title: "Side Part", service: "Royal package", date: "1 oy", likes: 28 },
];

const GOALS_INIT: Goal[] = [
  { id: "g1", title: "Oylik daromad", target: 15000000, current: 9800000, unit: "so'm", deadline: "30 Apr 2026", done: false },
  { id: "g2", title: "Yangi mijozlar", target: 20, current: 12, unit: "ta", deadline: "30 Apr 2026", done: false },
  { id: "g3", title: "5⭐ sharhlar", target: 50, current: 38, unit: "ta", deadline: "30 Iyun 2026", done: false },
  { id: "g4", title: "Instagram reels (10 ta)", target: 10, current: 10, unit: "ta", deadline: "20 Apr 2026", done: true },
];

const PROMOS_INIT: Promo[] = [
  { id: "p1", code: "WELCOME20", description: "Yangi mijozlar uchun 20%", discount_pct: 20, uses: 34, max_uses: 100, is_active: true, expires: "31 May 2026" },
  { id: "p2", code: "FRIDAY10", description: "Juma kunlarida 10%", discount_pct: 10, uses: 12, max_uses: 50, is_active: true, expires: "30 Apr 2026" },
  { id: "p3", code: "SUMMER25", description: "Yozgi aksiya 25%", discount_pct: 25, uses: 0, max_uses: 200, is_active: false, expires: "1 Jun 2026" },
];

export function BarberProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("independent");
  const [profile, setProfile] = useState<BarberProfile>(PROFILE);
  const [services, setServices] = useState<Service[]>(SERVICES_INIT);
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS_INIT);
  const [clients, setClients] = useState<Client[]>(CLIENTS);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS_INIT);
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS_INIT);
  const [promos, setPromos] = useState<Promo[]>(PROMOS_INIT);
  const [inventory, setInventory] = useState<InventoryItem[]>(INVENTORY_INIT);
  const [expenses, setExpenses] = useState<Expense[]>(EXPENSES_INIT);
  const [goals, setGoals] = useState<Goal[]>(GOALS_INIT);
  const [settings, setSettings] = useState<Settings>({
    notifications_email: true,
    notifications_push: true,
    notifications_sms: false,
    auto_accept: false,
    language: "uz",
    theme: "light",
  });

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const me = await apiJson<{
          id: number;
          email: string;
          full_name: string;
          phone: string;
          work_mode: "independent" | "salon_owner" | "salon_employee";
        }>("/api/v1/barber/auth/me/");
        if (!alive) return;
        setProfile((prev) => ({
          ...prev,
          id: String(me.id),
          name: me.full_name || prev.name,
          title: "Barber",
          email: me.email,
          phone: me.phone || prev.phone,
        }));
        setViewMode(me.work_mode === "independent" ? "independent" : "salon");
      } catch (e) {
        // Token invalid → force login
        clearBarberTokens();
        return;
      }

      try {
        const apiBookings = await apiJson<
          Array<{
            id: number;
            customer_name: string;
            customer_phone: string;
            start_at: string;
            end_at: string;
            status: string;
            total_price: string | number;
            lines: Array<{ service_name: string; duration_minutes: number; price: string | number }>;
          }>
        >("/api/v1/bookings/");
        if (!alive) return;
        setBookings(apiBookings.map(mapApiBooking));
      } catch {
        // keep fallback
      }

      try {
        const apiNotifs = await apiJson<
          Array<{
            id: number;
            type: string;
            title: string;
            body: string;
            read_at: string | null;
            created_at: string;
          }>
        >("/api/v1/notifications/");
        if (!alive) return;
        setNotifications(apiNotifs.map(mapApiNotification));
      } catch {
        // keep fallback
      }

      try {
        const apiConvos = await apiJson<
          Array<{
            id: string;
            last_message_text: string;
            last_message_at: string | null;
            other: { id: number; full_name: string };
          }>
        >("/api/v1/chat/conversations/");
        if (!alive) return;
        setConversations(apiConvos.map(mapApiConversation));
      } catch {
        // keep fallback
      }

      // Clients (independent only for now)
      try {
        const apiClients = await apiJson<
          Array<{
            id: number;
            full_name: string;
            phone: string;
            completed_bookings: number;
            total_spent: string;
          }>
        >("/api/v1/analytics/clients/independent/");
        if (!alive) return;
        setClients(apiClients.map(mapApiClient));
      } catch {
        // keep fallback
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  const refreshBookings = useCallback(async () => {
    const apiBookings = await apiJson<
      Array<{
        id: number;
        customer_name: string;
        customer_phone: string;
        start_at: string;
        end_at: string;
        status: string;
        total_price: string | number;
        lines: Array<{ service_name: string; duration_minutes: number; price: string | number }>;
      }>
    >("/api/v1/bookings/");
    setBookings(apiBookings.map(mapApiBooking));
  }, []);

  const mutateBooking = useCallback(async (id: string, action: "accept" | "reject" | "start" | "complete") => {
    const res = await apiFetch(`/api/v1/bookings/${id}/${action}/`, { method: "POST" });
    if (!res.ok) return;
    await refreshBookings();
  }, [refreshBookings]);

  const markNotifRead = useCallback(async (id: string) => {
    await apiFetch(`/api/v1/notifications/${id}/read/`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotifsRead = useCallback(async () => {
    const rows = await apiJson<Array<{ id: number }>>("/api/v1/notifications/");
    await Promise.all(rows.map((n) => apiFetch(`/api/v1/notifications/${n.id}/read/`, { method: "POST" })));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    const res = await apiFetch(`/api/v1/chat/conversations/${conversationId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const msg = (await res.json().catch(() => null)) as
      | { id: number; sender_kind: "USER" | "BARBER"; text: string; created_at: string }
      | null;
    if (!msg) return;
    const mapped = mapApiMessage(msg);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              preview: mapped.text,
              time: mapped.time,
              messages: [...(c.messages || []), mapped],
            }
          : c,
      ),
    );
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      viewMode,
      setViewMode,
      hasSalon: true,
      onboardingComplete: true,
      profile,
      services,
      workingHours: WORKING_HOURS,
      bookings,
      clients,
      notifications,
      conversations,
      reviews: REVIEWS,
      salon: SALON,
      transactions: TRANSACTIONS_INIT,
      promos,
      settings,
      startBooking: (id) => void mutateBooking(id, "start"),
      completeBooking: (id) => void mutateBooking(id, "complete"),
      cancelBooking: (id) => void mutateBooking(id, "reject"),
      acceptBooking: (id) => void mutateBooking(id, "accept"),
      markNotificationRead: (id) =>
        void markNotifRead(id),
      markAllNotificationsRead: () => void markAllNotifsRead(),
      sendChatMessage: (conversationId, text) => void sendMessage(conversationId, text),
      loadConversationMessages: async (conversationId) => {
        const data = await apiJson<{ results: Array<{ id: number; sender_kind: "USER" | "BARBER"; text: string; created_at: string }> }>(
          `/api/v1/chat/conversations/${conversationId}/messages/`,
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? { ...c, messages: data.results.map(mapApiMessage) }
              : c,
          ),
        );
      },
      toggleService: (id) =>
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)),
        ),
      togglePromo: (id) =>
        setPromos((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)),
        ),
      updateSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      inventory,
      expenses,
      portfolio: PORTFOLIO_INIT,
      goals,
      adjustInventory: (id, delta) =>
        setInventory((prev) =>
          prev.map((it) =>
            it.id === id ? { ...it, stock: Math.max(0, it.stock + delta) } : it,
          ),
        ),
      addExpense: (e) =>
        setExpenses((prev) => [{ ...e, id: `e-${Date.now()}` }, ...prev]),
      toggleGoal: (id) =>
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g)),
        ),
    }),
    [
      viewMode,
      profile,
      services,
      bookings,
      clients,
      notifications,
      conversations,
      promos,
      settings,
      inventory,
      expenses,
      goals,
      mutateBooking,
      markNotifRead,
      markAllNotifsRead,
      sendMessage,
    ],
  );

  return <BarberCtx.Provider value={value}>{children}</BarberCtx.Provider>;
}

function mapApiBooking(b: {
  id: number;
  customer_name: string;
  start_at: string;
  status: string;
  total_price: string | number;
  lines: Array<{ service_name: string; duration_minutes: number; price: string | number }>;
}): Booking {
  const dt = new Date(b.start_at);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  const status = mapBookingStatus(b.status);
  const line0 = b.lines?.[0];
  const service = line0?.service_name || "Xizmat";
  const duration_min = line0?.duration_minutes || 30;
  const priceN = typeof b.total_price === "string" ? Number(b.total_price) : b.total_price;
  return {
    id: String(b.id),
    client: b.customer_name || "Mijoz",
    client_avatar: `https://i.pravatar.cc/150?u=client-${b.id}`,
    service,
    date: dt.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }),
    time: `${hh}:${mm}`,
    duration_min,
    price: Number.isFinite(priceN) ? Number(priceN) : 0,
    status,
  };
}

function mapBookingStatus(st: string): Booking["status"] {
  const s = (st || "").toLowerCase();
  if (s === "pending") return "pending";
  if (s === "accepted") return "accepted";
  if (s === "in_progress") return "in_progress";
  if (s === "completed") return "completed";
  if (s === "rejected" || s === "cancelled") return "cancelled";
  return "pending";
}

function mapApiNotification(n: {
  id: number;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}): Notification {
  const dt = new Date(n.created_at);
  const time = dt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const kind = ((): Notification["kind"] => {
    const t = (n.type || "").toLowerCase();
    if (t.includes("chat")) return "chat";
    if (t.includes("review")) return "review";
    if (t.includes("booking")) return "booking";
    return "system";
  })();
  return { id: String(n.id), title: n.title, body: n.body, time, read: !!n.read_at, kind };
}

function mapApiConversation(c: {
  id: string;
  last_message_text: string;
  last_message_at: string | null;
  other: { id: number; full_name: string };
}): Conversation {
  const dt = c.last_message_at ? new Date(c.last_message_at) : null;
  const time = dt ? dt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "";
  return {
    id: c.id,
    client: c.other.full_name,
    avatar: `https://i.pravatar.cc/150?u=user-${c.other.id}`,
    preview: c.last_message_text || "",
    time,
    unread: 0,
    messages: [],
  };
}

function mapApiMessage(m: { id: number; sender_kind: "USER" | "BARBER"; text: string; created_at: string }): ChatMessage {
  const dt = new Date(m.created_at);
  const time = dt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  return { id: String(m.id), sender_kind: m.sender_kind, text: m.text, time };
}

function mapApiClient(c: { id: number; full_name: string; phone: string; completed_bookings: number; total_spent: string }): Client {
  const spent = Number(c.total_spent);
  return {
    id: String(c.id),
    name: c.full_name,
    avatar: `https://i.pravatar.cc/150?u=user-${c.id}`,
    phone: c.phone,
    visits: c.completed_bookings,
    last_visit: "",
    spent: Number.isFinite(spent) ? spent : 0,
  };
}

export function useBarberContext() {
  const ctx = useContext(BarberCtx);
  if (!ctx) throw new Error("useBarberContext must be used within BarberProvider");
  return ctx;
}

export function formatUZS(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M so'm`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K so'm`;
  return `${n} so'm`;
}
