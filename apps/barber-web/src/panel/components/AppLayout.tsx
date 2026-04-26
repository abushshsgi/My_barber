"use client";

import { BarberShellLayout } from "@/panel/components/BarberShellLayout";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <BarberShellLayout>{children}</BarberShellLayout>;
}
