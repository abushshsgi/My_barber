import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/providers/app-providers";

export const metadata: Metadata = {
  title: "MyBarber — Sartarosh",
  description: "Salon, bronlar va mijozlar boshqaruvi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased font-sans selection:bg-accent/30 selection:text-accent-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
