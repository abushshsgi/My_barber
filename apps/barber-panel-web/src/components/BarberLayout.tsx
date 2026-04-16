"use client";

import { AppSidebar } from "@/components/AppSidebar";

export function BarberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="ml-60 flex-1">{children}</main>
    </div>
  );
}

