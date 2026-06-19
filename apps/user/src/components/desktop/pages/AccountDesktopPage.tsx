import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const ACCOUNT_LINKS = [
  { to: "/settings", label: "Sozlamalar" },
  { to: "/favorites", label: "Sevimlilar" },
  { to: "/addresses", label: "Manzillar" },
  { to: "/payment-methods", label: "To'lov usullari" },
  { to: "/account/activity", label: "Faollik" },
  { to: "/account/preferences", label: "Afzalliklar" },
  { to: "/privacy", label: "Maxfiylik" },
  { to: "/support", label: "Yordam" },
];

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backTo?: string;
};

export function AccountDesktopPage({ title, subtitle, children, backTo = "/profile" }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="grid grid-cols-[220px_1fr] gap-8 items-start">
      <aside className="sticky top-24 space-y-1">
        <Link to={backTo} className="mb-4 block text-xs font-bold text-muted-foreground hover:text-foreground">
          ← Profil
        </Link>
        {ACCOUNT_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "block rounded-lg px-3 py-2 text-sm font-bold",
              pathname === to ? "bg-surface text-foreground" : "text-muted-foreground hover:bg-surface/60",
            )}
          >
            {label}
          </Link>
        ))}
      </aside>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        <div className="mt-6 rounded-2xl border border-border p-6">{children}</div>
      </div>
    </div>
  );
}
