"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BARBER_NAV, barberPageTitle } from "./barber-nav-config";

function navActive(path: string, pathname: string) {
  return path === "/"
    ? pathname === "/"
    : pathname === path || pathname.startsWith(`${path}/`);
}

export function BarberLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = barberPageTitle(pathname);

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-0.5">
      {BARBER_NAV.map(({ icon: Icon, label, path }) => {
        const active = navActive(path, pathname);
        return (
          <Link
            key={path}
            href={path}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-transform",
                active && "scale-105",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="barber-studio min-h-screen flex flex-col md:flex-row">
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-border/50 md:bg-sidebar/80 md:backdrop-blur-xl md:sticky md:top-0 md:h-[100dvh] md:py-6 md:px-3">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
            <Scissors className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold tracking-tight">MyBarber</p>
            <p className="text-xs text-muted-foreground">Studio panel</p>
          </div>
        </div>
        <NavLinks />
        <div className="mt-auto pt-6">
          <Link
            href="/notifications"
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Bell className="h-5 w-5 shrink-0" />
            Xabarnomalar
          </Link>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/40 bg-background/75 px-4 backdrop-blur-xl md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl"
                aria-label="Menyu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[288px] border-border/50 bg-sidebar/95 p-0">
              <div className="flex h-full flex-col px-4 pb-6 pt-10">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">MyBarber</p>
                    <p className="text-xs text-muted-foreground">Studio panel</p>
                  </div>
                </div>
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <div className="mt-auto border-t border-border/40 pt-4">
                  <Link
                    href="/notifications"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  >
                    <Bell className="h-5 w-5" />
                    Xabarnomalar
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <h1 className="truncate text-center text-base font-semibold tracking-tight">
            {title}
          </h1>
          <Link
            href="/notifications"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Xabarnomalar"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </header>

        <main className="flex-1 md:overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
