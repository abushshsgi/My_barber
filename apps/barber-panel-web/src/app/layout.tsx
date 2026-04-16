import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { BarberAuthGuard } from "@/components/BarberAuthGuard";

export const metadata: Metadata = {
  title: "MyBarber — Barber Panel",
  description: "Modern barber management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans">
        <AppProviders>
          <BarberAuthGuard>{children}</BarberAuthGuard>
        </AppProviders>
      </body>
    </html>
  );
}

