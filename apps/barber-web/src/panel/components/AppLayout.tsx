"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/panel/components/AppSidebar";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/panel/contexts/AppContext";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { notifications } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { viewMode } = useApp();

  useEffect(() => {
    // Keep URL consistent with selected view mode.
    if (viewMode === "independent" && pathname.startsWith("/salon-view")) {
      router.replace("/");
      return;
    }
    if (viewMode === "salon") {
      const independentOnlyPrefixes = ["/bookings", "/clients", "/chat", "/reviews"];
      if (independentOnlyPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        router.replace("/salon-view");
      }
    }
  }, [viewMode, pathname, router]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-foreground" />
              )}
            </Link>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
