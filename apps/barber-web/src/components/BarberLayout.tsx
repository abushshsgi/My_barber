"use client";

import { BarberBottomNav } from "./BarberBottomNav";

export function BarberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <BarberBottomNav />
    </div>
  );
}
