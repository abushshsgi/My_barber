"use client";

import { AppProvider } from "@/panel/contexts/AppContext";
import { AppLayout } from "@/panel/components/AppLayout";

export default function BarberDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <AppLayout>{children}</AppLayout>
    </AppProvider>
  );
}
