import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/admin/morph-ai" as const, label: "Analytics", exact: true },
  { to: "/admin/morph-ai/catalog" as const, label: "Katalog" },
  { to: "/admin/morph-ai/errors" as const, label: "Xatolar" },
  { to: "/admin/morph-ai/limits" as const, label: "Limitlar" },
  { to: "/admin/morph-ai/queue" as const, label: "Navbat" },
  { to: "/admin/morph-ai/budget" as const, label: "Byudjet" },
  { to: "/admin/morph-ai/popularity" as const, label: "Uslublar" },
  { to: "/admin/morph-ai/conversion" as const, label: "Konversiya" },
  { to: "/admin/morph-ai/gallery" as const, label: "Gallery" },
  { to: "/admin/morph-ai/settings" as const, label: "Sozlamalar" },
];

export function MorphAiSubNav() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.to || pathname === `${tab.to}/`
          : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-background font-semibold text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
