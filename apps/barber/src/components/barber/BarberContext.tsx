import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, apiJson, apiList, clearBarberTokens } from "@/lib/api";
import { inferFlowIdentity, type FlowIdentity } from "@/lib/barber-flow-config";

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

export type BookingSetupStatus = {
  ready: boolean;
  missing: string[];
  setupPath: string | null;
  hasLocation: boolean;
  hasServices: boolean;
  hasWorkingHours: boolean;
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
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "rejected";
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
  payload?: Record<string, unknown> | null;
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
  barber_reply?: string;
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
  kind: "booking" | "tip" | "payout" | "refund" | "expense";
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
  /** Backend: Salon.objects.filter(owner_barber=self).exists() */
  ownsSalon: boolean;
  /** Faol OWNER membership yoki ACTIVE ishchi memberships salon id */
  activeSalonId: number | null;
  /** Salonga qoʻshilgan ishchi — salon boshqara olmaydi */
  isJoinedWorker: boolean;
  barberWorkMode: "salon" | "independent";
  onboardingFlow: string | null;
  flowIdentity: FlowIdentity;
  onboardingComplete: boolean;
  requiredNextPath: string | null;
  bookingSetup: BookingSetupStatus;
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
  addService: (payload: { name: string; duration_min: number; price: number }) => Promise<boolean>;
  togglePromo: (id: string) => void;
  addPromo: (payload: {
    code: string;
    description: string;
    discount_pct: number;
    max_uses: number;
    expires?: string;
  }) => Promise<boolean>;
  sendAnnouncement: (payload: { title: string; message: string }) => Promise<boolean>;
  updateSettings: (patch: Partial<Settings>) => void;
  adjustInventory: (id: string, delta: number) => void;
  addInventoryItem: (
    payload: Omit<InventoryItem, "id" | "stock"> & { stock?: number },
  ) => Promise<boolean>;
  addExpense: (e: Omit<Expense, "id">) => void;
  toggleGoal: (id: string) => void;
  addGoal: (
    payload: Omit<Goal, "id" | "current" | "done"> & { current?: number; done?: boolean },
  ) => Promise<boolean>;
  uploadPortfolio: (payload: { file: File; title: string; service: string }) => Promise<boolean>;
  addSalonImage: (payload: { file: File }) => Promise<boolean>;
  sendSupportTicket: (payload: { subject: string; message: string }) => Promise<boolean>;
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
      {
        id: "m1",
        sender_kind: "CLIENT",
        text: "Salom, ertaga 11:00 ga bron qila olamanmi?",
        time: "10:20",
      },
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
      {
        id: "m5",
        sender_kind: "CLIENT",
        text: "Royal package ichida nima bor?",
        time: "Kecha 18:31",
      },
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
      {
        id: "m6",
        sender_kind: "BARBER",
        text: "Salom Otabek, vaqtingiz 15:00 ga ko'chirildi.",
        time: "2 kun",
      },
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
  cover: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&q=80",
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
  {
    id: "t1",
    date: "Bugun, 10:30",
    client: "Sherzod A.",
    service: "Klassik",
    amount: 80000,
    kind: "booking",
    status: "completed",
  },
  {
    id: "t2",
    date: "Bugun, 09:15",
    client: "Abdulla M.",
    service: "Klassik",
    amount: 80000,
    kind: "booking",
    status: "completed",
  },
  {
    id: "t3",
    date: "Bugun, 09:20",
    client: "Abdulla M.",
    service: "Tip",
    amount: 20000,
    kind: "tip",
    status: "completed",
  },
  {
    id: "t4",
    date: "Kecha, 17:45",
    client: "Anvar T.",
    service: "Soqol",
    amount: 50000,
    kind: "booking",
    status: "completed",
  },
  {
    id: "t5",
    date: "Kecha, 12:00",
    client: "—",
    service: "Haftalik to'lov",
    amount: -450000,
    kind: "payout",
    status: "completed",
  },
  {
    id: "t6",
    date: "2 kun oldin",
    client: "Diyor R.",
    service: "Royal",
    amount: 200000,
    kind: "booking",
    status: "pending",
  },
  {
    id: "t7",
    date: "3 kun oldin",
    client: "Otabek S.",
    service: "Bola sochi",
    amount: 40000,
    kind: "refund",
    status: "failed",
  },
];

const INVENTORY_INIT: InventoryItem[] = [
  {
    id: "i1",
    name: "Soch yog'i (Pomade)",
    category: "product",
    stock: 8,
    min_stock: 5,
    unit: "dona",
    price: 120000,
    supplier: "BarberPro",
  },
  {
    id: "i2",
    name: "Soqol yuvgich shampuni",
    category: "product",
    stock: 3,
    min_stock: 5,
    unit: "dona",
    price: 90000,
    supplier: "BarberPro",
  },
  {
    id: "i3",
    name: "Bir martalik ustara",
    category: "consumable",
    stock: 45,
    min_stock: 20,
    unit: "dona",
    price: 5000,
    supplier: "MedSupply",
  },
  {
    id: "i4",
    name: "Sochiq",
    category: "consumable",
    stock: 24,
    min_stock: 10,
    unit: "dona",
    price: 15000,
  },
  {
    id: "i5",
    name: "Mashinka tig'i (#2)",
    category: "tool",
    stock: 2,
    min_stock: 3,
    unit: "dona",
    price: 60000,
    supplier: "Wahl UZ",
  },
  {
    id: "i6",
    name: "Talc kukuni",
    category: "consumable",
    stock: 12,
    min_stock: 5,
    unit: "dona",
    price: 25000,
  },
];

const EXPENSES_INIT: Expense[] = [
  {
    id: "e1",
    date: "Bugun",
    category: "supplies",
    description: "Pomade va shampun",
    amount: 360000,
  },
  {
    id: "e2",
    date: "Kecha",
    category: "marketing",
    description: "Instagram reklama",
    amount: 150000,
  },
  { id: "e3", date: "1 Apr", category: "rent", description: "Aprel oyi ijara", amount: 2500000 },
  {
    id: "e4",
    date: "5 Apr",
    category: "utility",
    description: "Elektr va internet",
    amount: 280000,
  },
  {
    id: "e5",
    date: "10 Apr",
    category: "supplies",
    description: "Bir martalik ustaralar",
    amount: 100000,
  },
];

const PORTFOLIO_INIT: PortfolioItem[] = [
  {
    id: "pf1",
    image: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80",
    title: "Klassik Fade",
    service: "Klassik soch turmaklash",
    date: "2 kun oldin",
    likes: 24,
  },
  {
    id: "pf2",
    image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80",
    title: "Pompadour",
    service: "Royal package",
    date: "1 hafta oldin",
    likes: 41,
  },
  {
    id: "pf3",
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80",
    title: "Soqol parvarish",
    service: "Soqol olish",
    date: "1 hafta oldin",
    likes: 18,
  },
  {
    id: "pf4",
    image: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80",
    title: "Modern Crop",
    service: "Klassik soch turmaklash",
    date: "2 hafta",
    likes: 32,
  },
  {
    id: "pf5",
    image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&q=80",
    title: "Buzz Cut",
    service: "Klassik soch turmaklash",
    date: "3 hafta",
    likes: 15,
  },
  {
    id: "pf6",
    image: "https://images.unsplash.com/photo-1593702288056-f173a3a4c0a4?w=600&q=80",
    title: "Side Part",
    service: "Royal package",
    date: "1 oy",
    likes: 28,
  },
];

const GOALS_INIT: Goal[] = [
  {
    id: "g1",
    title: "Oylik daromad",
    target: 15000000,
    current: 9800000,
    unit: "so'm",
    deadline: "30 Apr 2026",
    done: false,
  },
  {
    id: "g2",
    title: "Yangi mijozlar",
    target: 20,
    current: 12,
    unit: "ta",
    deadline: "30 Apr 2026",
    done: false,
  },
  {
    id: "g3",
    title: "5⭐ sharhlar",
    target: 50,
    current: 38,
    unit: "ta",
    deadline: "30 Iyun 2026",
    done: false,
  },
  {
    id: "g4",
    title: "Instagram reels (10 ta)",
    target: 10,
    current: 10,
    unit: "ta",
    deadline: "20 Apr 2026",
    done: true,
  },
];

const PROMOS_INIT: Promo[] = [
  {
    id: "p1",
    code: "WELCOME20",
    description: "Yangi mijozlar uchun 20%",
    discount_pct: 20,
    uses: 34,
    max_uses: 100,
    is_active: true,
    expires: "31 May 2026",
  },
  {
    id: "p2",
    code: "FRIDAY10",
    description: "Juma kunlarida 10%",
    discount_pct: 10,
    uses: 12,
    max_uses: 50,
    is_active: true,
    expires: "30 Apr 2026",
  },
  {
    id: "p3",
    code: "SUMMER25",
    description: "Yozgi aksiya 25%",
    discount_pct: 25,
    uses: 0,
    max_uses: 200,
    is_active: false,
    expires: "1 Jun 2026",
  },
];

export function BarberProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("independent");
  const [profile, setProfile] = useState<BarberProfile>(PROFILE);
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [salon, setSalon] = useState<Salon>(SALON);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hasSalon, setHasSalon] = useState(false);
  const [ownsSalon, setOwnsSalon] = useState(false);
  const [activeSalonId, setActiveSalonId] = useState<number | null>(null);
  const [barberWorkMode, setBarberWorkMode] = useState<"salon" | "independent">("independent");
  const [onboardingFlow, setOnboardingFlow] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [requiredNextPath, setRequiredNextPath] = useState<string | null>(null);
  const [bookingSetup, setBookingSetup] = useState<BookingSetupStatus>({
    ready: true,
    missing: [],
    setupPath: null,
    hasLocation: true,
    hasServices: true,
    hasWorkingHours: true,
  });
  const [settings, setSettings] = useState<Settings>({
    notifications_email: true,
    notifications_push: true,
    notifications_sms: false,
    auto_accept: false,
    language: "uz",
    theme: "light",
  });

  const refreshServices = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        name: string;
        duration_minutes: number;
        price: string | number;
        is_active: boolean;
      }>("/api/v1/barber/services/");
    setServices(
      rows.map((s) => ({
        id: String(s.id),
        name: s.name,
        duration_min: s.duration_minutes,
        price: Number(s.price),
        is_active: !!s.is_active,
      })),
    );
  }, []);

  const refreshWorkingHours = useCallback(async () => {
    const rows = await apiList<{ weekday: number; open_time: string; close_time: string; is_day_off: boolean }>(
      "/api/v1/barber/working-hours/",
    );
    setWorkingHours(
      rows.map((w) => ({
        weekday: w.weekday,
        open: String(w.open_time).slice(0, 5),
        close: String(w.close_time).slice(0, 5),
        closed: !!w.is_day_off,
      })),
    );
  }, []);

  const refreshBookings = useCallback(async () => {
    const apiBookings = await apiList<{
        id: number;
        customer_name: string;
        customer_phone: string;
        start_at: string;
        end_at: string;
        status: string;
        total_price: string | number;
        lines: Array<{ service_name: string; duration_minutes: number; price: string | number }>;
      }>("/api/v1/bookings/");
    setBookings(apiBookings.map(mapApiBooking));
  }, []);

  const refreshNotifications = useCallback(async () => {
    const apiNotifs = await apiList<{
        id: number;
        type: string;
        title: string;
        body: string;
        payload?: Record<string, unknown> | null;
        read_at: string | null;
        created_at: string;
      }>("/api/v1/notifications/");
    setNotifications(apiNotifs.map(mapApiNotification));
  }, []);

  const refreshConversations = useCallback(async () => {
    const apiConvos = await apiList<{
        id: string;
        last_message_text: string;
        last_message_at: string | null;
        other: { id: number; full_name: string };
      }>("/api/v1/chat/conversations/");
    setConversations(apiConvos.map(mapApiConversation));
  }, []);

  const refreshClients = useCallback(
    async (scope?: { workMode?: "salon" | "independent"; salonId?: number | null }) => {
      const mode = scope?.workMode ?? barberWorkMode;
      const salonId = scope?.salonId ?? activeSalonId;
      const endpoint =
        mode === "salon" && salonId != null
          ? `/api/v1/analytics/clients/?salon=${salonId}`
          : "/api/v1/analytics/clients/independent/";
      const apiClients = await apiList<{
          id: number;
          full_name: string;
          phone: string;
          completed_bookings: number;
          total_spent: string;
        }>(endpoint);
      setClients(apiClients.map(mapApiClient));
    },
    [activeSalonId, barberWorkMode],
  );

  const refreshInventory = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        name: string;
        category: "tool" | "product" | "consumable";
        stock: number;
        min_stock: number;
        unit: string;
        price: string | number;
        supplier: string;
      }>("/api/v1/barber/inventory/");
    setInventory(
      rows.map((it) => ({
        id: String(it.id),
        name: it.name,
        category: it.category,
        stock: it.stock,
        min_stock: it.min_stock,
        unit: it.unit,
        price: Number(it.price),
        supplier: it.supplier || "",
      })),
    );
  }, []);

  const refreshExpenses = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        category: Expense["category"];
        description: string;
        amount: string | number;
        spent_on: string;
      }>("/api/v1/barber/expenses/");
    setExpenses(
      rows.map((e) => ({
        id: String(e.id),
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.spent_on,
      })),
    );
  }, []);

  const refreshGoals = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        title: string;
        target: string | number;
        current: string | number;
        unit: string;
        deadline: string;
        done: boolean;
      }>("/api/v1/barber/goals/");
    setGoals(
      rows.map((g) => ({
        id: String(g.id),
        title: g.title,
        target: Number(g.target),
        current: Number(g.current),
        unit: g.unit,
        deadline: g.deadline,
        done: g.done,
      })),
    );
  }, []);

  const refreshPromos = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        code: string;
        description: string;
        discount_pct: number;
        uses: number;
        max_uses: number;
        is_active: boolean;
        expires: string | null;
      }>("/api/v1/barber/promos/");
    setPromos(
      rows.map((p) => ({
        id: String(p.id),
        code: p.code,
        description: p.description,
        discount_pct: p.discount_pct,
        uses: p.uses,
        max_uses: p.max_uses,
        is_active: p.is_active,
        expires: p.expires || "",
      })),
    );
  }, []);

  const refreshSettings = useCallback(async () => {
    const s = await apiJson<Settings>("/api/v1/barber/settings/");
    setSettings((prev) => ({ ...prev, ...s }));
  }, []);

  const refreshPortfolio = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        image: string;
        title: string;
        service_name: string;
        created_at: string;
        likes: number;
      }>("/api/v1/barber/work-photos/");
    setPortfolio(
      rows.map((p) => ({
        id: String(p.id),
        image: p.image,
        title: p.title || "Ish rasmi",
        service: p.service_name || "Xizmat",
        date: p.created_at?.slice(0, 10) || "",
        likes: p.likes || 0,
      })),
    );
  }, []);

  const refreshFinanceSummary = useCallback(async () => {
    const r = await apiJson<{
      transactions: Array<{
        id: string;
        date: string;
        client: string;
        service: string;
        amount: string | number;
        kind: string;
        status: string;
      }>;
    }>("/api/v1/barber/finance/summary/");
    setTransactions(
      r.transactions.map((t) => ({
        id: t.id,
        date: t.date,
        client: t.client,
        service: t.service,
        amount: Number(t.amount),
        kind: (t.kind as Transaction["kind"]) || "booking",
        status: (t.status as Transaction["status"]) || "completed",
      })),
    );
  }, []);

  const refreshReviews = useCallback(async () => {
    const rows = await apiList<{
        id: number;
        client: string;
        avatar: string;
        rating: number;
        text: string;
        date: string;
        service: string;
        barber_reply?: string;
      }>("/api/v1/barber/reviews/");
    setReviews(
      rows.map((r) => ({
        id: String(r.id),
        client: r.client,
        avatar: r.avatar || `https://i.pravatar.cc/150?u=review-${r.id}`,
        rating: r.rating,
        text: r.text,
        date: r.date,
        service: r.service,
        barber_reply: r.barber_reply || "",
      })),
    );
  }, []);

  const refreshSalonView = useCallback(async () => {
    try {
      const rows = await apiList<{
          id: number;
          name: string;
          address: string;
          cover_image: string | null;
          rating_avg: number;
          review_count: number;
          images?: Array<{ image: string }>;
        }>("/api/v1/salons/mine/");
      const one = rows[0];
      if (!one) return;

      let members = 0;
      try {
        const staff = await apiList<{ id: number; full_name?: string; role?: string }>(
          `/api/v1/salons/${one.id}/staff/`,
        );
        members = Array.isArray(staff) ? staff.length : 0;
      } catch {
        /* staff endpoint optional */
      }

      setSalon({
        id: String(one.id),
        name: one.name,
        address: one.address || "",
        cover: one.cover_image || SALON.cover,
        rating: Number(one.rating_avg || 0),
        reviews_count: Number(one.review_count || 0),
        members,
        gallery: (one.images || []).map((i) => i.image),
      });
    } catch {
      // salon view optional for independent mode
    }
  }, []);

  const mutateBooking = useCallback(
    async (id: string, action: "accept" | "reject" | "start" | "complete" | "cancel") => {
      const res = await apiFetch(`/api/v1/bookings/${id}/${action}/`, { method: "POST" });
      if (!res.ok) return;
      await refreshBookings();
    },
    [refreshBookings],
  );

  const markNotifRead = useCallback(async (id: string) => {
    await apiFetch(`/api/v1/notifications/${id}/read/`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotifsRead = useCallback(async () => {
    await apiFetch("/api/v1/notifications/mark-all-read/", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const sendMessage = useCallback(async (conversationId: string, text: string) => {
    const res = await apiFetch(`/api/v1/chat/conversations/${conversationId}/messages/`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const msg = (await res.json().catch(() => null)) as {
      id: number;
      sender_kind: "USER" | "BARBER";
      text: string;
      created_at: string;
    } | null;
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

  const toggleServiceApi = useCallback(
    async (id: string) => {
      const current = services.find((s) => s.id === id);
      if (!current) return;
      await apiFetch(`/api/v1/barber/services/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !current.is_active }),
      });
      await refreshServices();
    },
    [refreshServices, services],
  );

  const togglePromoApi = useCallback(
    async (id: string) => {
      const current = promos.find((p) => p.id === id);
      if (!current) return;
      await apiFetch(`/api/v1/barber/promos/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !current.is_active }),
      });
      await refreshPromos();
    },
    [promos, refreshPromos],
  );

  const updateSettingsApi = useCallback(async (patch: Partial<Settings>) => {
    const res = await apiFetch("/api/v1/barber/settings/", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const adjustInventoryApi = useCallback(
    async (id: string, delta: number) => {
      await apiFetch(`/api/v1/barber/inventory/${id}/adjust/`, {
        method: "POST",
        body: JSON.stringify({ delta }),
      });
      await refreshInventory();
    },
    [refreshInventory],
  );

  const addExpenseApi = useCallback(
    async (e: Omit<Expense, "id">) => {
      await apiFetch("/api/v1/barber/expenses/", {
        method: "POST",
        body: JSON.stringify({
          category: e.category,
          description: e.description,
          amount: e.amount,
          spent_on: new Date().toISOString().slice(0, 10),
        }),
      });
      await refreshExpenses();
      await refreshFinanceSummary();
    },
    [refreshExpenses, refreshFinanceSummary],
  );

  const toggleGoalApi = useCallback(
    async (id: string) => {
      const g = goals.find((x) => x.id === id);
      if (!g) return;
      await apiFetch(`/api/v1/barber/goals/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({ done: !g.done }),
      });
      await refreshGoals();
    },
    [goals, refreshGoals],
  );

  const addServiceApi = useCallback(
    async (payload: { name: string; duration_min: number; price: number }) => {
      const res = await apiFetch("/api/v1/barber/services/", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          duration_minutes: payload.duration_min,
          price: payload.price,
          is_active: true,
        }),
      });
      if (!res.ok) return false;
      await refreshServices();
      return true;
    },
    [refreshServices],
  );

  const addPromoApi = useCallback(
    async (payload: {
      code: string;
      description: string;
      discount_pct: number;
      max_uses: number;
      expires?: string;
    }) => {
      const res = await apiFetch("/api/v1/barber/promos/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) return false;
      await refreshPromos();
      return true;
    },
    [refreshPromos],
  );

  const sendAnnouncementApi = useCallback(async (payload: { title: string; message: string }) => {
    const res = await apiFetch("/api/v1/barber/promos/broadcast/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.ok;
  }, []);

  const addInventoryItemApi = useCallback(
    async (payload: Omit<InventoryItem, "id" | "stock"> & { stock?: number }) => {
      const res = await apiFetch("/api/v1/barber/inventory/", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          stock: payload.stock ?? 0,
        }),
      });
      if (!res.ok) return false;
      await refreshInventory();
      return true;
    },
    [refreshInventory],
  );

  const addGoalApi = useCallback(
    async (
      payload: Omit<Goal, "id" | "current" | "done"> & { current?: number; done?: boolean },
    ) => {
      const res = await apiFetch("/api/v1/barber/goals/", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          current: payload.current ?? 0,
          done: payload.done ?? false,
        }),
      });
      if (!res.ok) return false;
      await refreshGoals();
      return true;
    },
    [refreshGoals],
  );

  const uploadPortfolioApi = useCallback(
    async (payload: { file: File; title: string; service: string }) => {
      const body = new FormData();
      body.append("image", payload.file);
      body.append("title", payload.title);
      body.append("service_name", payload.service);
      body.append("sort_order", "0");
      const res = await apiFetch("/api/v1/barber/work-photos/", {
        method: "POST",
        body,
        headers: {},
      });
      if (!res.ok) return false;
      await refreshPortfolio();
      return true;
    },
    [refreshPortfolio],
  );

  const addSalonImageApi = useCallback(
    async (payload: { file: File }) => {
      if (!salon.id) return false;
      const body = new FormData();
      body.append("images", payload.file);
      const res = await apiFetch(`/api/v1/salons/${salon.id}/add_images/`, {
        method: "POST",
        body,
        headers: {},
      });
      if (!res.ok) return false;
      await refreshSalonView();
      return true;
    },
    [refreshSalonView, salon.id],
  );

  const sendSupportTicketApi = useCallback(
    async (payload: { subject: string; message: string }) => {
      const res = await apiFetch("/api/v1/barber/support/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.ok;
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const me = await apiJson<{
          id: number;
          email: string;
          full_name: string;
          phone: string;
          work_mode: "independent" | "salon";
          onboarding_completed: boolean;
          owns_salon?: boolean;
          active_salon_id?: number | null;
        }>("/api/v1/barber/auth/me/");
        if (!alive) return;
        const wm = me.work_mode === "independent" ? "independent" : "salon";
        setBarberWorkMode(wm);
        const owns = Boolean(me.owns_salon);
        setOwnsSalon(owns);
        const aid =
          me.active_salon_id != null && Number.isFinite(Number(me.active_salon_id))
            ? Number(me.active_salon_id)
            : null;
        setActiveSalonId(aid);
        setProfile((prev) => ({
          ...prev,
          id: String(me.id),
          name: me.full_name || prev.name,
          title: "Barber",
          email: me.email,
          phone: me.phone || prev.phone,
        }));
        setViewMode(wm === "independent" ? "independent" : "salon");
        setHasSalon(wm !== "independent");
        setOnboardingComplete(Boolean(me.onboarding_completed ?? true));
        setRequiredNextPath(null);
        try {
          const st = await apiJson<{
            is_complete?: boolean;
            required_next_path?: string;
            flow?: string | null;
            booking_ready?: boolean;
            booking_missing?: string[];
            booking_setup_path?: string | null;
            has_location?: boolean;
            has_services?: boolean;
            has_working_hours?: boolean;
            has_membership_hours?: boolean;
          }>(
            "/api/v1/barber/onboarding/status/",
          );
          if (!alive) return;
          setOnboardingComplete(Boolean(st.is_complete));
          setRequiredNextPath(st.required_next_path ? String(st.required_next_path) : null);
          setOnboardingFlow(st.flow ? String(st.flow) : null);
          setBookingSetup({
            ready: st.booking_ready !== false,
            missing: Array.isArray(st.booking_missing) ? st.booking_missing.map(String) : [],
            setupPath: st.booking_setup_path ? String(st.booking_setup_path) : null,
            hasLocation: Boolean(st.has_location),
            hasServices: Boolean(st.has_services),
            hasWorkingHours: Boolean(st.has_working_hours ?? st.has_membership_hours),
          });
        } catch {
          // keep fallback from /auth/me when status endpoint is unavailable
          setOnboardingFlow(null);
        }
      } catch {
        clearBarberTokens();
        return;
      }

      try {
        await Promise.all([
          refreshServices(),
          refreshWorkingHours(),
          refreshBookings(),
          refreshNotifications(),
          refreshConversations(),
          refreshClients({ workMode: wm, salonId: aid }),
          refreshInventory(),
          refreshExpenses(),
          refreshGoals(),
          refreshPromos(),
          refreshSettings(),
          refreshPortfolio(),
          refreshFinanceSummary(),
          refreshReviews(),
          refreshSalonView(),
        ]);
      } catch {
        if (!alive) return;
        setBookings([]);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [
    refreshBookings,
    refreshClients,
    refreshConversations,
    refreshExpenses,
    refreshFinanceSummary,
    refreshGoals,
    refreshInventory,
    refreshNotifications,
    refreshPortfolio,
    refreshPromos,
    refreshReviews,
    refreshSalonView,
    refreshServices,
    refreshSettings,
    refreshWorkingHours,
  ]);

  const isJoinedWorker = useMemo(
    () => ownsSalon === false && barberWorkMode === "salon" && activeSalonId != null,
    [ownsSalon, barberWorkMode, activeSalonId],
  );
  const flowIdentity = useMemo(
    () =>
      inferFlowIdentity({
        onboardingFlow,
        workMode: barberWorkMode,
        ownsSalon,
        activeSalonId,
      }),
    [onboardingFlow, barberWorkMode, ownsSalon, activeSalonId],
  );

  const value = useMemo<Ctx>(
    () => ({
      viewMode,
      setViewMode,
      hasSalon,
      ownsSalon,
      activeSalonId,
      isJoinedWorker,
      barberWorkMode,
      onboardingFlow,
      flowIdentity,
      onboardingComplete,
      requiredNextPath,
      bookingSetup,
      profile,
      services,
      workingHours,
      bookings,
      clients,
      notifications,
      conversations,
      reviews,
      salon,
      transactions,
      promos,
      settings,
      startBooking: (id) => void mutateBooking(id, "start"),
      completeBooking: (id) => void mutateBooking(id, "complete"),
      cancelBooking: (id) => void mutateBooking(id, "cancel"),
      acceptBooking: (id) => void mutateBooking(id, "accept"),
      markNotificationRead: (id) => void markNotifRead(id),
      markAllNotificationsRead: () => void markAllNotifsRead(),
      sendChatMessage: (conversationId, text) => void sendMessage(conversationId, text),
      loadConversationMessages: async (conversationId) => {
        const data = await apiJson<{
          results: Array<{
            id: number;
            sender_kind: "USER" | "BARBER";
            text: string;
            created_at: string;
          }>;
        }>(`/api/v1/chat/conversations/${conversationId}/messages/`);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId ? { ...c, messages: data.results.map(mapApiMessage) } : c,
          ),
        );
      },
      toggleService: (id) => void toggleServiceApi(id),
      addService: (payload) => addServiceApi(payload),
      togglePromo: (id) => void togglePromoApi(id),
      addPromo: (payload) => addPromoApi(payload),
      sendAnnouncement: (payload) => sendAnnouncementApi(payload),
      updateSettings: (patch) => void updateSettingsApi(patch),
      inventory,
      expenses,
      portfolio,
      goals,
      adjustInventory: (id, delta) => void adjustInventoryApi(id, delta),
      addInventoryItem: (payload) => addInventoryItemApi(payload),
      addExpense: (e) => void addExpenseApi(e),
      toggleGoal: (id) => void toggleGoalApi(id),
      addGoal: (payload) => addGoalApi(payload),
      uploadPortfolio: (payload) => uploadPortfolioApi(payload),
      addSalonImage: (payload) => addSalonImageApi(payload),
      sendSupportTicket: (payload) => sendSupportTicketApi(payload),
    }),
    [
      viewMode,
      hasSalon,
      ownsSalon,
      activeSalonId,
      isJoinedWorker,
      barberWorkMode,
      onboardingFlow,
      flowIdentity,
      onboardingComplete,
      requiredNextPath,
      bookingSetup,
      profile,
      services,
      workingHours,
      bookings,
      clients,
      notifications,
      conversations,
      reviews,
      salon,
      transactions,
      promos,
      settings,
      inventory,
      expenses,
      portfolio,
      goals,
      toggleServiceApi,
      addServiceApi,
      togglePromoApi,
      addPromoApi,
      sendAnnouncementApi,
      updateSettingsApi,
      adjustInventoryApi,
      addInventoryItemApi,
      addExpenseApi,
      toggleGoalApi,
      addGoalApi,
      uploadPortfolioApi,
      addSalonImageApi,
      sendSupportTicketApi,
      mutateBooking,
      markNotifRead,
      markAllNotifsRead,
      sendMessage,
      onboardingFlow,
      flowIdentity,
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
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const bookingDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const diffDays = Math.round((bookingDay.getTime() - today.getTime()) / 86400000);
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
    date:
      diffDays === 0
        ? "Today"
        : diffDays === 1
          ? "Tomorrow"
          : dt.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }),
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
  if (s === "rejected") return "rejected";
  if (s === "cancelled") return "cancelled";
  return "pending";
}

function mapApiNotification(n: {
  id: number;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown> | null;
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
  return {
    id: String(n.id),
    title: n.title,
    body: n.body,
    time,
    read: !!n.read_at,
    kind,
    payload: n.payload && typeof n.payload === "object" ? n.payload : null,
  };
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

function mapApiMessage(m: {
  id: number;
  sender_kind: "USER" | "BARBER";
  text: string;
  created_at: string;
}): ChatMessage {
  const dt = new Date(m.created_at);
  const time = dt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  return {
    id: String(m.id),
    sender_kind: m.sender_kind === "USER" ? "CLIENT" : "BARBER",
    text: m.text,
    time,
  };
}

function mapApiClient(c: {
  id: number;
  full_name: string;
  phone: string;
  completed_bookings: number;
  total_spent: string;
}): Client {
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
