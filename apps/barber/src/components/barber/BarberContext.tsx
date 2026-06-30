import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiJson, apiList, getBarberAccessToken } from "@/lib/api";
import { barberQueryKeys } from "@/hooks/use-barber-queries";
import { mapApiBooking } from "@/lib/map-booking";
import { bookingDateLabel, bookingEarningsAt } from "@/lib/finance-range";
import { readBookingsSnapshot } from "@/lib/barber-snapshot-cache";
import {
  fetchBarberBookings,
  useBarberBookingsQuery,
} from "@/hooks/use-barber-queries";
import { inferFlowIdentity, type FlowIdentity } from "@/lib/barber-flow-config";
import { clearOnboardingJustCompleted } from "@/lib/onboarding-complete";
import {
  clearOnboardingStatusCache,
  readOnboardingStatusCache,
  writeOnboardingStatusCache,
} from "@/lib/onboarding-status-cache";

type OnboardingStatusPayload = {
  is_complete?: boolean;
  required_next_path?: string | null;
  flow?: string | null;
  booking_ready?: boolean;
  booking_missing?: string[];
  booking_setup_path?: string | null;
  has_location?: boolean;
  has_services?: boolean;
  has_services_count?: number;
  has_working_hours?: boolean;
  has_membership_hours?: boolean;
  fully_ready?: boolean;
  owns_salon?: boolean;
  email_verified?: boolean;
  readiness_percent?: number;
  steps?: Partial<ActivationSteps>;
};

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

export type ActivationSteps = {
  email_verified: boolean;
  signup_complete: boolean;
  services_ok: boolean;
  schedule_ok: boolean;
};

export const MIN_ACTIVE_SERVICES = 5;

export type BookingLine = {
  service_name: string;
  duration_minutes: number;
  price: number;
};

export type Booking = {
  id: string;
  customer_id?: string;
  client: string;
  client_avatar: string;
  client_phone?: string;
  service: string;
  date: string; // "Today" | "Tomorrow" | "DD MMM"
  time: string;
  duration_min: number;
  price: number;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled" | "rejected";
  /** ISO8601 — diagrammalar va filtrlash uchun */
  start_at?: string;
  end_at?: string;
  started_at?: string | null;
  completed_at?: string;
  salon_name?: string | null;
  lines?: BookingLine[];
  payment_method?: "cash" | "online";
  payment_status?: string;
  paid_at?: string | null;
  portfolio_consent?: boolean | null;
  portfolio_allowed?: boolean;
  result_image_url?: string | null;
  order_number?: string;
  check_in_code?: string;
  notes?: string;
  booked_for_name?: string | null;
  salon_address?: string | null;
  salon_latitude?: number | null;
  salon_longitude?: number | null;
  checked_in_at?: string | null;
  status_history?: Array<{ key: string; label: string; at: string }>;
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

export type ReviewDimension = {
  dimension: string;
  score: number;
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
  dimensions: ReviewDimension[];
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
  payment_method?: string | null;
};

export type FinanceTotals = {
  income_total: number;
  expense_total: number;
  net_total: number;
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
  fullyReady: boolean;
  /** Birinchi onboarding/status yuklanganidan keyin true — redirect loop oldini oladi. */
  activationHydrated: boolean;
  readinessPercent: number;
  activationSteps: ActivationSteps;
  /** Serverdagi faol xizmatlar soni (onboarding/status). */
  activationServicesCount: number;
  refreshActivationStatus: () => Promise<{ fullyReady: boolean; emailVerified: boolean }>;
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
  financeTotals: FinanceTotals;
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

const EMPTY_PROFILE: BarberProfile = {
  id: "",
  name: "",
  title: "",
  email: "",
  phone: "",
  avatar: "",
  bio: "",
};

const EMPTY_SALON: Salon = {
  id: "",
  name: "",
  address: "",
  cover: "",
  rating: 0,
  reviews_count: 0,
  members: 0,
  gallery: [],
};

export function BarberProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const bootCache = readOnboardingStatusCache();
  const [viewMode, setViewMode] = useState<ViewMode>("independent");
  const [profile, setProfile] = useState<BarberProfile>(EMPTY_PROFILE);
  const [services, setServices] = useState<Service[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [bookings, setBookings] = useState<Booking[]>(() => readBookingsSnapshot() ?? []);
  const [clients, setClients] = useState<Client[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [salon, setSalon] = useState<Salon>(EMPTY_SALON);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financeTotals, setFinanceTotals] = useState<FinanceTotals>({
    income_total: 0,
    expense_total: 0,
    net_total: 0,
  });
  const [promos, setPromos] = useState<Promo[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [hasSalon, setHasSalon] = useState(false);
  const [ownsSalon, setOwnsSalon] = useState(() => bootCache?.owns_salon === true);
  const [activeSalonId, setActiveSalonId] = useState<number | null>(null);
  const [barberWorkMode, setBarberWorkMode] = useState<"salon" | "independent">("independent");
  const [onboardingFlow, setOnboardingFlow] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(
    () => bootCache?.fully_ready === true,
  );
  const [requiredNextPath, setRequiredNextPath] = useState<string | null>(
    () => bootCache?.required_next_path ?? null,
  );
  const [bookingSetup, setBookingSetup] = useState<BookingSetupStatus>({
    ready: false,
    missing: [],
    setupPath: null,
    hasLocation: false,
    hasServices: false,
    hasWorkingHours: false,
  });
  const [fullyReady, setFullyReady] = useState(() => bootCache?.fully_ready === true);
  const [activationHydrated, setActivationHydrated] = useState(false);
  const [readinessPercent, setReadinessPercent] = useState(0);
  const [activationSteps, setActivationSteps] = useState<ActivationSteps>({
    email_verified: false,
    signup_complete: false,
    services_ok: false,
    schedule_ok: false,
  });
  const [activationServicesCount, setActivationServicesCount] = useState(0);
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
    const rows = await apiList<{
      weekday: number;
      open_time: string;
      close_time: string;
      is_day_off: boolean;
    }>("/api/v1/barber/working-hours/");
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
    const mapped = await fetchBarberBookings();
    setBookings(mapped);
    setClients((prev) => enrichClientsLastVisit(prev, mapped));
    return mapped;
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
        avatar?: string;
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
      income_total: string | number;
      expense_total: string | number;
      net_total: string | number;
      transactions: Array<{
        id: string;
        date: string;
        client: string;
        service: string;
        amount: string | number;
        kind: string;
        status: string;
        payment_method?: string | null;
      }>;
    }>("/api/v1/barber/finance/summary/");
    setFinanceTotals({
      income_total: Number(r.income_total) || 0,
      expense_total: Number(r.expense_total) || 0,
      net_total: Number(r.net_total) || 0,
    });
    setTransactions(
      r.transactions.map((t) => ({
        id: t.id,
        date: t.date,
        client: t.client,
        service: t.service,
        amount: Number(t.amount),
        kind: (t.kind as Transaction["kind"]) || "booking",
        status: (t.status as Transaction["status"]) || "completed",
        payment_method: t.payment_method ?? null,
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
      dimensions?: Array<{ dimension: string; score: number }>;
    }>("/api/v1/barber/reviews/");
    setReviews(
      rows.map((r) => ({
        id: String(r.id),
        client: r.client,
        avatar: r.avatar || "",
        rating: r.rating,
        text: r.text,
        date: r.date,
        service: r.service,
        barber_reply: r.barber_reply || "",
        dimensions: r.dimensions ?? [],
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
        cover: one.cover_image || "",
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
      const runAction = async (act: typeof action) => {
        const res = await apiFetch(`/api/v1/bookings/${id}/${act}/`, { method: "POST" });
        return res.ok;
      };

      if (action === "complete") {
        const current = bookings.find((b) => b.id === id);
        if (current && current.status !== "in_progress") {
          const started = await runAction("start");
          if (!started) return;
        }
      }

      const ok = await runAction(action);
      if (!ok) return;
      await refreshBookings();
      if (action === "complete" || action === "cancel") {
        await refreshFinanceSummary();
        void queryClient.invalidateQueries({ queryKey: barberQueryKeys.finance() });
        void queryClient.invalidateQueries({ queryKey: barberQueryKeys.payoutBalance() });
        void queryClient.invalidateQueries({ queryKey: [...barberQueryKeys.all, "analytics"] });
      }
    },
    [bookings, queryClient, refreshBookings, refreshFinanceSummary],
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

  const emptyActivationSteps = (): ActivationSteps => ({
    email_verified: false,
    signup_complete: false,
    services_ok: false,
    schedule_ok: false,
  });

  const applyActivationStatus = useCallback((st: OnboardingStatusPayload) => {
    const gate = Boolean(st.fully_ready);
    setOnboardingComplete(Boolean(st.is_complete));
    setRequiredNextPath(st.required_next_path ? String(st.required_next_path) : null);
    setOnboardingFlow(st.flow ? String(st.flow) : null);
    setFullyReady(gate);
    setReadinessPercent(
      typeof st.readiness_percent === "number" && !Number.isNaN(st.readiness_percent)
        ? st.readiness_percent
        : 0,
    );
    const s = st.steps;
    if (s && typeof s === "object") {
      setActivationSteps({
        email_verified: Boolean(s.email_verified),
        signup_complete: Boolean(s.signup_complete),
        services_ok: Boolean(s.services_ok),
        schedule_ok: Boolean(s.schedule_ok),
      });
    } else {
      setActivationSteps(emptyActivationSteps());
    }
    setActivationServicesCount(
      typeof st.has_services_count === "number" && !Number.isNaN(st.has_services_count)
        ? st.has_services_count
        : 0,
    );
    setBookingSetup({
      ready: st.booking_ready !== false,
      missing: Array.isArray(st.booking_missing) ? st.booking_missing.map(String) : [],
      setupPath: st.booking_setup_path ? String(st.booking_setup_path) : null,
      hasLocation: Boolean(st.has_location),
      hasServices: Boolean(st.has_services),
      hasWorkingHours: Boolean(st.has_working_hours ?? st.has_membership_hours),
    });
    const emailVerified = Boolean(
      st.email_verified ?? (s && typeof s === "object" ? s.email_verified : false),
    );
    return { fullyReady: gate, emailVerified };
  }, []);

  const reloadActivationFromApi = useCallback(async (): Promise<{
    fullyReady: boolean;
    emailVerified: boolean;
  }> => {
    try {
      const st = await apiJson<OnboardingStatusPayload>("/api/v1/barber/onboarding/status/");
      writeOnboardingStatusCache({
        fully_ready: st.fully_ready,
        required_next_path: st.required_next_path ?? null,
        owns_salon: st.owns_salon,
      });
      return applyActivationStatus(st);
    } catch {
      setFullyReady(false);
      setReadinessPercent(0);
      setActivationSteps(emptyActivationSteps());
      setOnboardingFlow(null);
      return { fullyReady: false, emailVerified: false };
    }
  }, [applyActivationStatus]);

  const refreshActivationStatus = useCallback(async () => {
    return reloadActivationFromApi();
  }, [reloadActivationFromApi]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      let gateFullyReady = false;
      let emailVerified = false;
      let wm: "independent" | "salon" = "independent";
      let aid: number | null = null;
      let ownsSalonFlag = false;
      try {
        const [me, st] = await Promise.all([
          apiJson<{
            id: number;
            email: string;
            full_name: string;
            phone: string;
            avatar?: string | null;
            work_mode: "independent" | "salon";
            onboarding_completed: boolean;
            owns_salon?: boolean;
            active_salon_id?: number | null;
          }>("/api/v1/barber/auth/me/"),
          apiJson<OnboardingStatusPayload>("/api/v1/barber/onboarding/status/"),
        ]);
        if (!alive) return;
        wm = me.work_mode === "independent" ? "independent" : "salon";
        setBarberWorkMode(wm);
        const owns = Boolean(me.owns_salon);
        ownsSalonFlag = owns;
        setOwnsSalon(owns);
        aid =
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
          avatar: (me.avatar && String(me.avatar)) || prev.avatar || "",
        }));
        setViewMode(
          wm === "independent" ? "independent" : owns ? "independent" : "salon",
        );
        setHasSalon(wm !== "independent");
        if (!alive) return;
        writeOnboardingStatusCache({
          fully_ready: st.fully_ready,
          required_next_path: st.required_next_path ?? null,
          owns_salon: owns,
        });
        const activation = applyActivationStatus(st);
        gateFullyReady = activation.fullyReady;
        emailVerified = activation.emailVerified;
        clearOnboardingJustCompleted();
      } catch {
        if (!getBarberAccessToken()) return;
        setFullyReady(false);
        setReadinessPercent(0);
        setActivationSteps(emptyActivationSteps());
        setActivationHydrated(true);
        return;
      }

      const loadSecondary = () => {
        if (!alive) return;
        const runQuiet = (fns: Array<() => Promise<void>>) => {
          void Promise.all(fns.map((fn) => fn().catch(() => undefined)));
        };
        if (!gateFullyReady) {
          if (emailVerified) runQuiet([refreshServices, refreshWorkingHours]);
          return;
        }
        if (ownsSalonFlag) void refreshSalonView().catch(() => undefined);
        void Promise.all([
          refreshBookings(),
          refreshNotifications(),
          refreshServices(),
          refreshWorkingHours(),
          refreshReviews(),
          () => refreshClients({ workMode: wm, salonId: aid }),
          refreshFinanceSummary(),
        ].map((fn) => Promise.resolve(typeof fn === "function" ? fn() : fn).catch(() => undefined)));
        const defer = () => {
          if (!alive) return;
          void Promise.all([
            refreshConversations,
            refreshInventory,
            refreshExpenses,
            refreshGoals,
            refreshPromos,
            refreshSettings,
            refreshPortfolio,
          ].map((fn) => fn().catch(() => undefined)));
        };
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(defer, { timeout: 800 });
        } else {
          window.setTimeout(defer, 200);
        }
      };
      loadSecondary();
      setActivationHydrated(true);
    };
    void run();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate
  }, []);

  const bookingsQuery = useBarberBookingsQuery(fullyReady && activationHydrated);

  useEffect(() => {
    if (!bookingsQuery.data) return;
    setBookings(bookingsQuery.data);
    setClients((prev) => enrichClientsLastVisit(prev, bookingsQuery.data));
  }, [bookingsQuery.data]);

  useEffect(() => {
    if (!fullyReady || !activationHydrated) return;
    const tick = () => void refreshNotifications();
    const id = window.setInterval(tick, 60_000);
    const onFocus = () => void refreshNotifications();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fullyReady, activationHydrated, refreshNotifications]);

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
      fullyReady,
      activationHydrated,
      readinessPercent,
      activationSteps,
      activationServicesCount,
      refreshActivationStatus,
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
      financeTotals,
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
      fullyReady,
      activationHydrated,
      readinessPercent,
      activationSteps,
      activationServicesCount,
      refreshActivationStatus,
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
      financeTotals,
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
      reloadActivationFromApi,
    ],
  );

  return <BarberCtx.Provider value={value}>{children}</BarberCtx.Provider>;
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
  other: { id: number; full_name: string; avatar?: string | null };
}): Conversation {
  const dt = c.last_message_at ? new Date(c.last_message_at) : null;
  const time = dt ? dt.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "";
  return {
    id: c.id,
    client: c.other.full_name,
    avatar: (c.other.avatar && String(c.other.avatar)) || "",
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

function enrichClientsLastVisit(clients: Client[], bookings: Booking[]): Client[] {
  if (!clients.length) return clients;
  const latest = new Map<string, string>();
  for (const b of bookings) {
    if (!b.customer_id) continue;
    if (b.status === "cancelled" || b.status === "rejected") continue;
    const at = b.status === "completed" ? bookingEarningsAt(b) : b.start_at;
    if (!at) continue;
    const prev = latest.get(b.customer_id);
    if (!prev || at > prev) latest.set(b.customer_id, at);
  }
  return clients.map((c) => {
    const iso = latest.get(c.id);
    if (!iso) return c;
    return { ...c, last_visit: bookingDateLabel(iso) };
  });
}

function mapApiClient(c: {
  id: number;
  full_name: string;
  phone: string;
  avatar?: string;
  completed_bookings: number;
  total_spent: string;
}): Client {
  const spent = Number(c.total_spent);
  return {
    id: String(c.id),
    name: c.full_name,
    avatar: (c.avatar && String(c.avatar)) || "",
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
