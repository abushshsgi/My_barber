import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, CalendarClock, LayoutGrid, MessageSquareText, UserCircle } from "lucide-react";
import { fetchAdminBarberDetail } from "@/lib/admin-api";
import { getBarberSegmentDescription } from "@/lib/barber-segment-copy";
import { barberDetailSearchFromRaw } from "@/lib/admin-nav";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/barbers/$barberId")({
  validateSearch: (raw: Record<string, unknown>) => barberDetailSearchFromRaw(raw),
  component: BarberIdLayout,
});

function BarberIdLayout() {
  const { barberId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = Route.useSearch();

  const barberQ = useQuery({
    queryKey: ["admin", "barber", barberId],
    queryFn: () => fetchAdminBarberDetail(barberId),
  });

  const b = barberQ.data;
  const tab = pathname.includes("/stats")
    ? "stats"
    : pathname.endsWith("/bookings")
      ? "bookings"
      : pathname.endsWith("/reviews")
        ? "reviews"
        : "overview";

  const tabCls = (key: typeof tab) =>
    cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      tab === key
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
    );

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/30 to-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to={search.returnTo ?? "/admin/barbers"}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" /> {search.returnTo ? "Orqaga" : "Sartaroshlar"}
          </Link>

          {barberQ.isLoading ? (
            <div className="flex gap-4 animate-pulse">
              <div className="size-16 rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-8 w-48 bg-muted rounded" />
                <div className="h-4 w-72 bg-muted rounded" />
              </div>
            </div>
          ) : barberQ.isError ? (
            <p className="text-sm text-destructive">{(barberQ.error as Error)?.message}</p>
          ) : b ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={b.avatar}
                  alt=""
                  className="size-16 rounded-2xl object-cover ring-2 ring-border shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight truncate">
                    {b.name}
                  </h1>
                  <p className="text-sm text-muted-foreground truncate">{b.email}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-0.5">
                      Reyting {b.rating.toFixed(1)}
                    </span>
                    <span className="rounded-md bg-muted px-2 py-0.5">{b.reviews_count} sharh</span>
                    {b.is_active ? (
                      <span className="rounded-md bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 px-2 py-0.5">
                        Faol
                      </span>
                    ) : (
                      <span className="rounded-md bg-muted px-2 py-0.5">Nofaol</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {b ? (
            <div
              className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-4 sm:px-5 border-l-4 border-l-primary shadow-sm"
              role="region"
              aria-label="Ishlash turi"
            >
              <div className="flex gap-3 sm:gap-4">
                <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
                  <UserCircle className="size-6 sm:size-7" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tizimda qanday ishlaydi
                  </p>
                  <p className="font-heading text-xl sm:text-2xl font-semibold leading-snug text-foreground">
                    {b.account_segment_label}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                    {getBarberSegmentDescription(b.account_segment)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <nav className="mt-6 flex flex-wrap gap-1 border-t border-border pt-4">
            <Link
              to="/admin/barbers/$barberId"
              params={{ barberId }}
              search={search.returnTo ? { returnTo: search.returnTo } : {}}
              className={tabCls("overview")}
            >
              <LayoutGrid className="size-4" /> Umumiy
            </Link>
            <Link
              to="/admin/barbers/$barberId/stats"
              params={{ barberId }}
              search={search.returnTo ? { returnTo: search.returnTo } : {}}
              className={tabCls("stats")}
            >
              <BarChart3 className="size-4" /> Statistika
            </Link>
            <Link
              to="/admin/barbers/$barberId/bookings"
              params={{ barberId }}
              search={search.returnTo ? { returnTo: search.returnTo } : {}}
              className={tabCls("bookings")}
            >
              <CalendarClock className="size-4" /> Bronlar
            </Link>
            <Link
              to="/admin/barbers/$barberId/reviews"
              params={{ barberId }}
              search={search.returnTo ? { returnTo: search.returnTo } : {}}
              className={tabCls("reviews")}
            >
              <MessageSquareText className="size-4" /> Sharhlar
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </div>
    </div>
  );
}
