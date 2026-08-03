import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/admin/morph-ai" as const, label: "Analytics", exact: true },
  { to: "/admin/morph-ai/studio" as const, label: "Studio" },
  {
    to: "/admin/morph-ai/list/$kind" as const,
    params: { kind: "generations" as const },
    label: "Faoliyat",
    matchPrefix: "/admin/morph-ai/list/generations",
  },
  {
    to: "/admin/morph-ai/list/$kind" as const,
    params: { kind: "spenders" as const },
    label: "Userlar",
    matchPrefix: "/admin/morph-ai/list/spenders",
  },
  { to: "/admin/morph-ai/catalog" as const, label: "Katalog" },
  { to: "/admin/morph-ai/errors" as const, label: "Xatolar" },
  { to: "/admin/morph-ai/limits" as const, label: "Limitlar" },
  { to: "/admin/morph-ai/queue" as const, label: "Navbat" },
  { to: "/admin/morph-ai/budget" as const, label: "Byudjet" },
  { to: "/admin/morph-ai/popularity" as const, label: "Uslublar" },
  { to: "/admin/morph-ai/conversion" as const, label: "Konversiya" },
  { to: "/admin/morph-ai/gallery" as const, label: "Gallery" },
  { to: "/admin/morph-ai/settings" as const, label: "Sozlamalar" },
] as const;

export function MorphAiSubNav() {
  const { pathname } = useLocation();
  return (
    <div className="sticky top-0 z-20 -mx-1 space-y-2 bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold tracking-tight text-foreground">
          Morph AI bo&apos;limlari
        </h2>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Chap menyu yoki shu tablar
        </p>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/80 p-1.5 shadow-card">
        {TABS.map((tab) => {
          const matchPrefix = "matchPrefix" in tab ? tab.matchPrefix : undefined;
          const active = matchPrefix
            ? pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`)
            : "exact" in tab && tab.exact
              ? pathname === tab.to || pathname === `${tab.to}/`
              : pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          const params = "params" in tab ? tab.params : undefined;
          return (
            <Link
              key={tab.label}
              to={tab.to}
              {...(params ? { params } : {})}
              className={cn(
                "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
