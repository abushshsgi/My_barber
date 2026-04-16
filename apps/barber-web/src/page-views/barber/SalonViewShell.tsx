"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SalonMineRow } from "./salon-view-types";

async function fetchMineSalons(): Promise<SalonMineRow[]> {
  const res = await apiFetch("/api/v1/salons/mine/");
  if (!res.ok) return [];
  return res.json() as Promise<SalonMineRow[]>;
}

type Props = {
  salonId: number | null;
  onSalonChange: (id: number) => void;
  title: string;
  children: React.ReactNode;
};

export default function SalonViewShell({ salonId, onSalonChange, title, children }: Props) {
  const pathname = usePathname();

  const { data: salons = [], isLoading } = useQuery({
    queryKey: ["salons", "mine", "salon-view"],
    queryFn: fetchMineSalons,
    staleTime: 60_000,
  });

  const active = useMemo(() => salonId ?? salons[0]?.id ?? null, [salonId, salons]);

  const tabs = [
    { href: "/salon-view", label: "Salon" },
    { href: "/salon-view/gallery", label: "Gallery" },
    { href: "/salon-view/reviews", label: "Reviews" },
  ];

  const hasSalons = salons.length > 0;

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">
              Salon View — faqat info, rasmlar va otzivlar
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Salon</span>
              <select
                className="h-10 w-full min-w-[220px] rounded-2xl border border-border/60 bg-card/50 px-3 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={active ?? ""}
                disabled={!hasSalons}
                onChange={(e) => onSalonChange(Number(e.target.value))}
              >
                {!hasSalons && <option value="">Salon yo‘q</option>}
                {salons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-5xl gap-2 overflow-x-auto pb-1">
          {tabs.map((t) => {
            const activeTab = t.href === "/salon-view" ? pathname === "/salon-view" : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "whitespace-nowrap rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors",
                  activeTab
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      )}

      {!isLoading && !hasSalons && (
        <div className="mx-auto max-w-2xl px-4 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Siz hech qaysi salonga ulanmagansiz (yoki salon topilmadi).
          </p>
        </div>
      )}

      {!isLoading && hasSalons && children}
    </div>
  );
}

