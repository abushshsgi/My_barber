import { create } from "zustand";
import type { Booking, Salon } from "./mock-data";
import { mockBookings, mockSalons } from "./mock-data";

interface BarberState {
  view: "independent" | "salon";
  setView: (view: "independent" | "salon") => void;
  bookings: Booking[];
  updateBookingStatus: (id: string, status: Booking["status"]) => void;
  salons: Salon[];
  selectedSalonId: string | null;
  setSelectedSalonId: (id: string) => void;
}

export const useBarberStore = create<BarberState>((set) => ({
  view: "independent",
  setView: (view) => set({ view }),
  bookings: mockBookings,
  updateBookingStatus: (id, status) =>
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id
          ? { ...b, status, startedAt: status === "in_progress" ? Date.now() : b.startedAt }
          : b
      ),
    })),
  salons: mockSalons,
  selectedSalonId: mockSalons[0]?.id ?? null,
  setSelectedSalonId: (id) => set({ selectedSalonId: id }),
}));
