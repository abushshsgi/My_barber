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

interface AppContextType {
  viewMode: "independent" | "salon";
  setViewMode: (mode: "independent" | "salon") => void;
  selectedSalonId: string | null;
  setSelectedSalonId: (id: string | null) => void;
  me: BarberMe | null;
  profile: BarberProfileState | null;
  services: BarberServiceState[];
  workingHours: BarberWorkingHourState[];
  bookings: Booking[];
  startBooking: (id: string) => Promise<void>;
  completeBooking: (id: string) => Promise<void>;
  salons: Salon[];
  reviews: Review[];
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
      work_mode: me.work_mode,
    });
  }, []);

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
  }, [loadMe, loadProfile, loadServices, loadWorkingHours, loadBookings, loadNotifications]);

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
        bookings,
        startBooking,
        completeBooking,
        salons: [],
        reviews: [],
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
