"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { formatDistanceToNow, isToday, parseISO } from "date-fns";

export type BookingStatus = "accepted" | "in_progress" | "completed";

export interface Booking {
  id: string;
  clientName: string;
  service: string;
  time: string;
  date: string;
  status: BookingStatus;
  startedAt?: number;
  completedAt?: number;
  price: number;
}

export interface Salon {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  coverImage: string;
  images: string[];
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  completed_bookings: number;
  total_spent: string;
  classification: "new" | "returning";
}

export interface ChatConversation {
  id: string; // public uuid
  other: { kind: "USER" | "BARBER"; id: number; full_name: string };
  last_message_text: string;
  last_message_at: string | null;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  sender_kind: "USER" | "BARBER";
  text: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

export interface BarberMe {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  work_mode: "salon" | "independent";
}

export interface BarberProfileState {
  exists: boolean;
  location_text?: string;
  latitude?: string | null;
  longitude?: string | null;
}

export interface BarberServiceState {
  id: number;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
}

export interface BarberWorkingHourState {
  id: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
  breaks?: { start: string; end: string }[];
}

export interface SalonSummary {
  id: string;
  name: string;
  cover_image: string | null;
  address: string;
  is_published: boolean;
  rating_avg: number;
  review_count: number;
}

export interface SalonViewDetail {
  id: string;
  name: string;
  address: string;
  phone: string;
  cover_image: string | null;
  images: string[];
  rating_avg: number;
  review_count: number;
}

export interface BarberReview {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface AppContextType {
  viewMode: "independent" | "salon";
  setViewMode: (mode: "independent" | "salon") => void;
  selectedSalonId: string | null;
  setSelectedSalonId: (id: string | null) => void;
  me: BarberMe | null;
  profile: BarberProfileState | null;
  services: BarberServiceState[];
  workingHours: BarberWorkingHourState[];
  salons: SalonSummary[];
  salonView: SalonViewDetail | null;
  clients: ClientRow[];
  reviews: BarberReview[];
  salonReviews: BarberReview[];
  chatConversations: ChatConversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => Promise<void>;
  bookings: Booking[];
  startBooking: (id: string) => Promise<void>;
  completeBooking: (id: string) => Promise<void>;
  notifications: Notification[];
  markNotificationRead: (id: string) => Promise<void>;
  messages: Message[];
}

const AppContext = createContext<AppContextType | null>(null);

type BookingApi = {
  id: number;
  status: BookingStatus | string;
  start_at: string;
  end_at: string;
  started_at?: string | null;
  customer_name: string;
  customer_phone?: string;
  salon_name?: string | null;
  total_price: string;
  lines: { id: number; service_name: string; price: string; duration_minutes: number }[];
  created_at: string;
};

type NotificationApi = {
  id: number;
  type: string;
  title: string;
  body: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
};

type BarberMeApi = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  work_mode: "salon" | "independent";
};

type BarberProfileApi = {
  exists: boolean;
  id?: number;
  location_text?: string;
  latitude?: string | null;
  longitude?: string | null;
};

type BarberServiceApi = {
  id: number;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
};

type BarberWorkingHourApi = {
  id: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
  breaks?: { start: string; end: string }[];
};

type SalonMineRowApi = {
  id: number;
  name: string;
  cover_image: string | null;
  address: string | null;
  is_published: boolean;
  rating_avg?: number;
  review_count?: number;
};

type SalonBarberViewApi = {
  id: number;
  name: string;
  cover_image: string | null;
  address: string | null;
  phone: string | null;
  rating_avg?: number;
  review_count?: number;
  images: { id: number; image: string; sort_order: number }[];
};

type ReviewApi = {
  id: number;
  author_name?: string;
  rating: number;
  text: string;
  created_at: string;
};

type AnalyticsClientRowApi = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  completed_bookings: number;
  total_spent: string;
  classification: "new" | "returning";
};

type ChatConversationApi = {
  id: string;
  last_message_text: string;
  last_message_at: string | null;
  updated_at: string;
  other: { kind: "USER" | "BARBER"; id: number; full_name: string };
};

type ChatMessageApi = {
  id: number;
  sender_kind: "USER" | "BARBER";
  text: string;
  created_at: string;
};

function toSalonSummaryRow(s: SalonMineRowApi): SalonSummary {
  return {
    id: String(s.id),
    name: s.name,
    cover_image: s.cover_image,
    address: s.address || "",
    is_published: Boolean(s.is_published),
    rating_avg: Number(s.rating_avg || 0),
    review_count: Number(s.review_count || 0),
  };
}

function toSalonViewDetailRow(s: SalonBarberViewApi): SalonViewDetail {
  return {
    id: String(s.id),
    name: s.name,
    address: s.address || "",
    phone: s.phone || "",
    cover_image: s.cover_image,
    images: Array.isArray(s.images) ? s.images.map((im) => im.image).filter(Boolean) : [],
    rating_avg: Number(s.rating_avg || 0),
    review_count: Number(s.review_count || 0),
  };
}

function toReviewRow(r: ReviewApi): BarberReview {
  return {
    id: String(r.id),
    author: r.author_name || "Client",
    rating: Number(r.rating || 0),
    comment: r.text || "",
    date: r.created_at ? r.created_at.slice(0, 10) : "",
  };
}

function hhmmFromIso(s: string): string {
  const d = parseISO(s);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function bookingDateLabel(startAtIso: string): string {
  const d = parseISO(startAtIso);
  if (isToday(d)) return "Today";
  return d.toISOString().slice(0, 10);
}

function toBookingRow(b: BookingApi): Booking | null {
  const st = String(b.status);
  if (st !== "accepted" && st !== "in_progress" && st !== "completed") return null;
  const service =
    b.lines?.length ? b.lines.map((l) => l.service_name).join(", ") : "Service";
  return {
    id: String(b.id),
    clientName: b.customer_name || "Client",
    service,
    time: hhmmFromIso(b.start_at),
    date: bookingDateLabel(b.start_at),
    status: st as BookingStatus,
    startedAt: b.started_at ? parseISO(b.started_at).getTime() : undefined,
    price: Math.round(Number(b.total_price) || 0),
  };
}

function toNotificationRow(n: NotificationApi): Notification {
  const created = parseISO(n.created_at);
  const time = formatDistanceToNow(created, { addSuffix: true });
  return {
    id: String(n.id),
    title: n.title || "Notification",
    description: n.body || "",
    time,
    read: Boolean(n.read_at),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<"independent" | "salon">("independent");
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [me, setMe] = useState<BarberMe | null>(null);
  const [profile, setProfile] = useState<BarberProfileState | null>(null);
  const [services, setServices] = useState<BarberServiceState[]>([]);
  const [workingHours, setWorkingHours] = useState<BarberWorkingHourState[]>([]);
  const [salons, setSalons] = useState<SalonSummary[]>([]);
  const [salonView, setSalonView] = useState<SalonViewDetail | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [reviews, setReviews] = useState<BarberReview[]>([]);
  const [salonReviews, setSalonReviews] = useState<BarberReview[]>([]);
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const loadMe = useCallback(async () => {
    const res = await apiFetch("/api/v1/barber/auth/me/");
    if (!res.ok) return;
    const me = (await res.json()) as BarberMeApi;
    setViewMode(me.work_mode === "salon" ? "salon" : "independent");
    setMe({
      id: me.id,
      email: me.email,
      full_name: me.full_name,
      phone: me.phone,
      role: me.role,
      work_mode: me.work_mode,
    });
  }, []);

  const loadMySalons = useCallback(async () => {
    const res = await apiFetch("/api/v1/salons/mine/");
    if (!res.ok) return;
    const j = (await res.json()) as SalonMineRowApi[];
    const rows = Array.isArray(j) ? j : [];
    const mapped = rows.map(toSalonSummaryRow);
    setSalons(mapped);
    setSelectedSalonId((prev) => prev || (mapped[0]?.id ?? null));
  }, []);

  const loadSalonView = useCallback(async (salonId: string | null) => {
    if (!salonId) {
      setSalonView(null);
      return;
    }
    const res = await apiFetch(`/api/v1/salons/${encodeURIComponent(salonId)}/barber_view/`);
    if (!res.ok) {
      setSalonView(null);
      return;
    }
    const j = (await res.json()) as SalonBarberViewApi;
    setSalonView(toSalonViewDetailRow(j));
  }, []);

  const loadClients = useCallback(async (mode: "independent" | "salon", salonId: string | null) => {
    if (mode === "salon" && !salonId) {
      setClients([]);
      return;
    }
    const path =
      mode === "independent"
        ? "/api/v1/analytics/clients/independent/?"
        : `/api/v1/analytics/clients/?salon=${encodeURIComponent(salonId)}`;
    const res = await apiFetch(path);
    if (!res.ok) return;
    const j = (await res.json()) as AnalyticsClientRowApi[];
    const rows = Array.isArray(j) ? j : [];
    setClients(
      rows.map((r) => ({
        id: String(r.id),
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        completed_bookings: r.completed_bookings,
        total_spent: r.total_spent,
        classification: r.classification,
      }))
    );
  }, []);

  const loadBarberReviews = useCallback(async (barberId: number | null) => {
    if (!barberId) return;
    const res = await apiFetch(`/api/v1/reviews/?barber=${encodeURIComponent(String(barberId))}`);
    if (!res.ok) return;
    const j = (await res.json()) as { results?: ReviewApi[] } | ReviewApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    setReviews(rows.map(toReviewRow));
  }, []);

  const loadSalonReviews = useCallback(async (salonId: string | null) => {
    if (!salonId) {
      setSalonReviews([]);
      return;
    }
    const res = await apiFetch(`/api/v1/reviews/?salon=${encodeURIComponent(String(salonId))}`);
    if (!res.ok) {
      setSalonReviews([]);
      return;
    }
    const j = (await res.json()) as { results?: ReviewApi[] } | ReviewApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    setSalonReviews(rows.map(toReviewRow));
  }, []);

  const loadChatConversations = useCallback(async () => {
    const res = await apiFetch("/api/v1/chat/conversations/");
    if (!res.ok) return;
    const j = (await res.json()) as ChatConversationApi[];
    const rows = Array.isArray(j) ? j : [];
    setChatConversations(rows);
    setActiveConversationId((prev) => prev || (rows[0]?.id ?? null));
  }, []);

  const loadChatMessages = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      setChatMessages([]);
      return;
    }
    const res = await apiFetch(`/api/v1/chat/conversations/${encodeURIComponent(conversationId)}/messages/`);
    if (!res.ok) {
      setChatMessages([]);
      return;
    }
    const j = (await res.json()) as { results?: ChatMessageApi[] } | ChatMessageApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    setChatMessages(rows);
  }, []);

  const sendChatMessage = useCallback(async (text: string) => {
    const convoId = activeConversationId;
    if (!convoId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const res = await apiFetch(`/api/v1/chat/conversations/${encodeURIComponent(convoId)}/messages/`, {
      method: "POST",
      body: JSON.stringify({ text: trimmed }),
    });
    if (!res.ok) return;
    // Refresh messages + conversations for last message preview.
    await loadChatMessages(convoId);
    await loadChatConversations();
  }, [activeConversationId, loadChatMessages, loadChatConversations]);

  const loadProfile = useCallback(async () => {
    const res = await apiFetch("/api/v1/barber/profile/");
    if (!res.ok) return;
    const p = (await res.json()) as BarberProfileApi;
    setProfile({
      exists: Boolean(p.exists),
      location_text: p.location_text,
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    });
  }, []);

  const loadServices = useCallback(async () => {
    const res = await apiFetch("/api/v1/barber/services/");
    if (!res.ok) return;
    const j = (await res.json()) as { results?: BarberServiceApi[] } | BarberServiceApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    setServices(rows);
  }, []);

  const loadWorkingHours = useCallback(async () => {
    const res = await apiFetch("/api/v1/barber/working-hours/");
    if (!res.ok) return;
    const j = (await res.json()) as
      | { results?: BarberWorkingHourApi[] }
      | BarberWorkingHourApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    setWorkingHours(rows);
  }, []);

  const loadBookings = useCallback(async () => {
    const res = await apiFetch("/api/v1/bookings/");
    if (!res.ok) return;
    const j = (await res.json()) as { results?: BookingApi[] } | BookingApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    const mapped = rows.map(toBookingRow).filter(Boolean) as Booking[];
    setBookings(mapped);
  }, []);

  const loadNotifications = useCallback(async () => {
    const res = await apiFetch("/api/v1/notifications/");
    if (!res.ok) return;
    const j = (await res.json()) as { results?: NotificationApi[] } | NotificationApi[];
    const rows = Array.isArray(j) ? j : j.results || [];
    setNotifications(rows.map(toNotificationRow));
  }, []);

  useEffect(() => {
    void loadMe();
    void loadProfile();
    void loadServices();
    void loadWorkingHours();
    void loadBookings();
    void loadNotifications();
    void loadChatConversations();
  }, [
    loadMe,
    loadProfile,
    loadServices,
    loadWorkingHours,
    loadBookings,
    loadNotifications,
    loadChatConversations,
  ]);

  // Dependent loads (need me / selectedSalonId / viewMode)
  useEffect(() => {
    void loadBarberReviews(me?.id ?? null);
  }, [me?.id, loadBarberReviews]);

  useEffect(() => {
    if (viewMode === "salon") {
      void loadMySalons();
    } else {
      setSalons([]);
      setSelectedSalonId(null);
      setSalonView(null);
      setSalonReviews([]);
    }
  }, [viewMode, loadMySalons]);

  useEffect(() => {
    if (viewMode === "salon") {
      void loadSalonView(selectedSalonId);
      void loadSalonReviews(selectedSalonId);
      void loadClients("salon", selectedSalonId);
    } else {
      void loadClients("independent", null);
    }
  }, [viewMode, selectedSalonId, loadSalonView, loadSalonReviews, loadClients]);

  useEffect(() => {
    void loadChatMessages(activeConversationId);
  }, [activeConversationId, loadChatMessages]);

  const startBooking = useCallback(async (id: string) => {
    // Optimistic UI
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: "in_progress", startedAt: Date.now() } : b
      )
    );
    const res = await apiFetch(`/api/v1/bookings/${encodeURIComponent(id)}/start/`, {
      method: "POST",
    });
    if (!res.ok) {
      // rollback by refetch
      await loadBookings();
      return;
    }
    await loadBookings();
  }, [loadBookings]);

  const completeBooking = useCallback(async (id: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: "completed", completedAt: Date.now() } : b
      )
    );
    const res = await apiFetch(`/api/v1/bookings/${encodeURIComponent(id)}/complete/`, {
      method: "POST",
      body: JSON.stringify({ early_finish: true }),
    });
    if (!res.ok) {
      await loadBookings();
      return;
    }
    await loadBookings();
  }, [loadBookings]);

  const markNotificationRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const res = await apiFetch(
      `/api/v1/notifications/${encodeURIComponent(id)}/read/`,
      { method: "POST" }
    );
    if (!res.ok) {
      await loadNotifications();
      return;
    }
    await loadNotifications();
  }, [loadNotifications]);

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedSalonId,
        setSelectedSalonId,
        me,
        profile,
        services,
        workingHours,
        salons,
        salonView,
        clients,
        reviews,
        salonReviews,
        chatConversations,
        activeConversationId,
        setActiveConversationId,
        chatMessages,
        sendChatMessage,
        bookings,
        startBooking,
        completeBooking,
        notifications,
        markNotificationRead,
        messages: [],
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
