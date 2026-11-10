import { Link, useLocation } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarRange, ChevronDown, RefreshCw } from "lucide-react";
import { ANALYTICS_PRESETS } from "@/lib/revenue-analytics";
import { comparisonCaption, useAnalyticsPeriod } from "@/components/admin/RevenueAnalytics";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/analytics", label: "Umumiy", exact: true },
  { to: "/admin/analytics/visitors", label: "Tashriflar" },
  { to: "/admin/analytics/funnel", label: "Sotuv voronkasi" },
  { to: "/admin/analytics/payments", label: "To'lovlar" },
  { to: "/admin/analytics/revenue", label: "Daromad" },
  { to: "/admin/analytics/users", label: "Foydalanuvchi yo'li" },
  { to: "/admin/analytics/ai", label: "AI analitika" },
  { to: "/admin/analytics/sources", label: "Trafik manbalari" },
] as const;

function isNavActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to || pathname === `${to}/`;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AnalyticsChrome({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const period = useAnalyticsPeriod();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const journeyDetail = /\/admin\/analytics\/users\/[^/]+$/.test(pathname);
  const live = pathname.startsWith("/admin/analytics/realtime");
  const showRange = !live && !journeyDetail;

  async function refresh() {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
      <div className="sticky top-0 z-20 -mx-4 border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-heading text-[1.75rem] font-semibold leading-none tracking-tight sm:text-3xl">
              Analitika
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              MySaloon platformasining real vaqtdagi o'sishi va daromad ko'rsatkichlari.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showRange ? <RangeMenu /> : null}
            {showRange ? <ComparisonNote preset={period.preset} /> : null}
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted"
              aria-label="Yangilash"
            >
              <RefreshCw
                className={cn("size-3.5", refreshing && "animate-spin motion-reduce:animate-none")}
              />
              <span className="hidden sm:inline">Yangilash</span>
            </button>
            <Link
              to="/admin/analytics/realtime"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm transition-colors",
                live ? "bg-foreground text-background" : "bg-card hover:bg-muted",
              )}
            >
              <span className="ax-pulse size-1.5 rounded-full bg-success" />
              Jonli
            </Link>
          </div>
        </div>
        {showRange && period.preset === "custom" ? (
          <div className="flex flex-wrap gap-2 pb-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Dan
              <input
                type="date"
                value={period.start}
                onChange={(event) => period.setStart(event.target.value)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Gacha
              <input
                type="date"
                value={period.end}
                onChange={(event) => period.setEnd(event.target.value)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm text-foreground"
              />
            </label>
          </div>
        ) : null}
        <nav aria-label="Analitika bo'limlari" className="-mx-1 flex gap-1 overflow-x-auto pb-3">
          {NAV.map((item) => {
            const active = isNavActive(pathname, item.to, "exact" in item && item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div key={pathname} className="ax-enter pt-6">
        {children}
      </div>
    </div>
  );
}

function RangeMenu() {
  const period = useAnalyticsPeriod();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = ANALYTICS_PRESETS.find(([value]) => value === period.preset)?.[1] ?? "Davr";

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm"
      >
        <CalendarRange className="size-3.5 text-muted-foreground" />
        {current}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Sana oralig'i"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-card"
        >
          {ANALYTICS_PRESETS.map(([value, label]) => (
            <li key={value}>
              <button
                type="button"
                role="option"
                aria-selected={period.preset === value}
                onClick={() => {
                  period.setPreset(value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  period.preset === value && "bg-muted font-medium",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ComparisonNote({ preset }: { preset: string }) {
  const [open, setOpen] = useState(false);
  const caption = comparisonCaption(preset);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 max-w-[220px] items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground"
      >
        <span className="truncate">
          Taqqoslash · <span className="text-foreground">{caption}</span>
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-border bg-card p-3 text-xs leading-relaxed text-muted-foreground shadow-card">
          <p className="font-medium text-foreground">Avtomatik taqqoslash</p>
          <p className="mt-1">
            Server har bir davrni oldingi teng oyna bilan solishtiradi. Bugun — kecha, shu
            soatgacha. Kecha va kunlik kesimlar — undan oldingi kun. 7, 30, 90 kun va tanlangan
            oraliq — shu uzunlikdagi oldingi oyna.
          </p>
          <button
            type="button"
            className="mt-2 text-foreground underline-offset-2 hover:underline"
            onClick={() => setOpen(false)}
          >
            Yopish
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SectionIntro({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function FetchBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="mb-4 h-0.5 overflow-hidden rounded-full bg-muted"
      role="status"
      aria-label="Yangilanmoqda"
    >
      <div className="h-full w-1/3 animate-pulse rounded-full bg-foreground/70 motion-reduce:animate-none" />
    </div>
  );
}

export function AnalyticsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3 bg-card p-4">
            <div className="h-2.5 w-20 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-7 w-28 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-2.5 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-2xl border border-border bg-card motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export function AnalyticsError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-card px-5 py-8 text-center">
      <p className="font-heading text-lg font-semibold">Ma'lumot yuklanmadi</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {message || "Qayta urinib ko'ring."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-foreground px-3 py-1.5 text-sm text-background"
      >
        Qayta urinish
      </button>
    </div>
  );
}

export function AnalyticsEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <p className="font-heading text-base font-semibold">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Noma'lum xato";
}
