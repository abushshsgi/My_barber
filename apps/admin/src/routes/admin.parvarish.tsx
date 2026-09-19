import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/admin/parvarish" as const, label: "Umumiy", exact: true },
  { to: "/admin/parvarish/tarkib" as const, label: "Tarkib" },
  { to: "/admin/parvarish/ob-havo" as const, label: "Ob-havo" },
  { to: "/admin/parvarish/likes" as const, label: "Likes" },
] as const;

export const Route = createFileRoute("/admin/parvarish")({
  component: ParvarishLayout,
});

function ParvarishLayout() {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="sticky top-0 z-20 -mx-1 space-y-2 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
            Parvarish
          </h2>
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/80 p-1.5 shadow-card">
          {TABS.map((tab) => {
            const active =
              "exact" in tab && tab.exact
                ? pathname === tab.to || pathname === `${tab.to}/`
                : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <Outlet />
    </div>
  );
}
