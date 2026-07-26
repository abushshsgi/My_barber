import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Building2,
  LayoutDashboard,
  LogOut,
  QrCode,
  Wallet,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  agentApiJson,
  clearAgentTokens,
  type AgentMe,
} from "@/lib/agent-api";

const NAV = [
  { to: "/agent", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/agent/salons", label: "Salonlar", icon: Building2 },
  { to: "/agent/invite", label: "QR / Kod", icon: QrCode },
  { to: "/agent/aylanma", label: "Aylanma", icon: ArrowLeftRight },
  { to: "/agent/payout", label: "Payout", icon: Wallet },
] as const;

export function AgentShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const meQ = useQuery({
    queryKey: ["agent", "me"],
    queryFn: () => agentApiJson<AgentMe>("/api/v1/agent/me/"),
  });

  function logout() {
    clearAgentTokens();
    navigate({ to: "/agent/login" });
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/70 via-background to-stone-100 flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/90 backdrop-blur">
        <div className="p-4 border-b border-border">
          <MysaloonLogo size="sm" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Agent kabineti
          </p>
          <p className="font-heading text-sm font-semibold truncate">
            {meQ.data?.full_name ?? "…"}
          </p>
          {meQ.data?.code ? (
            <code className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] tracking-wider">
              {meQ.data.code}
            </code>
          ) : null}
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === "/agent" || pathname === "/agent/"
              : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="outline" className="w-full" size="sm" onClick={logout}>
            <LogOut className="size-4 mr-1.5" />
            Chiqish
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <MysaloonLogo size="sm" />
              <p className="text-xs text-muted-foreground truncate">
                {meQ.data?.full_name}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="size-4" />
            </Button>
          </div>
          <nav className="mt-2 flex gap-1 overflow-x-auto pb-1">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === "/agent" || pathname === "/agent/"
                : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                    active ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
