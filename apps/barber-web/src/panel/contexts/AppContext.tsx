"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

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

interface AppContextType {
  viewMode: "independent" | "salon";
  setViewMode: (mode: "independent" | "salon") => void;
  selectedSalonId: string | null;
  setSelectedSalonId: (id: string | null) => void;
  bookings: Booking[];
  startBooking: (id: string) => void;
  completeBooking: (id: string) => void;
  salons: Salon[];
  reviews: Review[];
  notifications: Notification[];
  messages: Message[];
}

const AppContext = createContext<AppContextType | null>(null);

const MOCK_BOOKINGS: Booking[] = [
  { id: "1", clientName: "Alex Johnson", service: "Classic Haircut", time: "09:00", date: "Today", status: "accepted", price: 35 },
  { id: "2", clientName: "Mike Smith", service: "Beard Trim", time: "10:30", date: "Today", status: "accepted", price: 20 },
  { id: "3", clientName: "David Lee", service: "Full Service", time: "12:00", date: "Today", status: "in_progress", startedAt: Date.now() - 600000, price: 55 },
  { id: "4", clientName: "Chris Wang", service: "Fade Haircut", time: "14:00", date: "Today", status: "completed", price: 40, completedAt: Date.now() - 3600000 },
  { id: "5", clientName: "Ryan Davis", service: "Classic Haircut", time: "15:30", date: "Today", status: "completed", price: 35, completedAt: Date.now() - 7200000 },
];

const MOCK_SALONS: Salon[] = [
  {
    id: "s1",
    name: "Elite Cuts Studio",
    address: "123 Main St, Downtown",
    phone: "+1 (555) 123-4567",
    rating: 4.8,
    reviewCount: 124,
    coverImage: "https://images.unsplash.com/photo-1585747860019-8e8ef2e1f46a?w=1200&h=400&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1503951914875-452f3a3e1a00?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop",
    ],
  },
];

const MOCK_REVIEWS: Review[] = [
  { id: "r1", author: "James K.", rating: 5, comment: "Best haircut I've ever had. Very professional.", date: "2 days ago" },
  { id: "r2", author: "Tom B.", rating: 4, comment: "Great atmosphere and solid work.", date: "1 week ago" },
  { id: "r3", author: "Mark P.", rating: 5, comment: "Always consistent quality. Highly recommend.", date: "2 weeks ago" },
  { id: "r4", author: "Steve R.", rating: 3, comment: "Good but had to wait a bit.", date: "3 weeks ago" },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "New booking", description: "Alex Johnson booked Classic Haircut for 09:00", time: "5 min ago", read: false },
  { id: "n2", title: "Review received", description: "James K. left a 5-star review", time: "1 hour ago", read: false },
  { id: "n3", title: "Booking completed", description: "Chris Wang's session completed", time: "3 hours ago", read: true },
];

const MOCK_MESSAGES: Message[] = [
  { id: "m1", sender: "Alex Johnson", text: "Hey, can I reschedule to 10am?", time: "09:15", isMe: false },
  { id: "m2", sender: "Me", text: "Sure, 10am works. See you then!", time: "09:17", isMe: true },
  { id: "m3", sender: "Alex Johnson", text: "Thanks!", time: "09:18", isMe: false },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<"independent" | "salon">("independent");
  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(MOCK_SALONS[0]?.id || null);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);

  const startBooking = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "in_progress" as BookingStatus, startedAt: Date.now() } : b))
    );
  }, []);

  const completeBooking = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "completed" as BookingStatus, completedAt: Date.now() } : b))
    );
  }, []);

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedSalonId,
        setSelectedSalonId,
        bookings,
        startBooking,
        completeBooking,
        salons: MOCK_SALONS,
        reviews: MOCK_REVIEWS,
        notifications: MOCK_NOTIFICATIONS,
        messages: MOCK_MESSAGES,
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
