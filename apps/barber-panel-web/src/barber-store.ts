"use client";

import { create } from "zustand";

type ViewMode = "independent" | "salon";

interface BarberState {
  view: ViewMode;
  setView: (view: ViewMode) => void;
}

export const useBarberStore = create<BarberState>((set) => ({
  view: "independent",
  setView: (view) => set({ view }),
}));
