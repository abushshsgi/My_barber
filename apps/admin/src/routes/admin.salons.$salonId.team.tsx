import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminSalonDetail } from "@/lib/admin-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users } from "lucide-react";

export const Route = createFileRoute("/admin/salons/$salonId/team")({
  component: SalonTeamTab,
});

function roleUz(role: string): string {
  if (role === "owner") return "Egasi";
  if (role === "worker") return "Ishchi";
  return role;
}

function initials(name: string, email: string): string {
  const n = name.trim();
  if (n.length >= 2) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = email.trim();
  if (e.length >= 2) return e.slice(0, 2).toUpperCase();
  return "?";
}

function SalonTeamTab() {
  const { salonId } = Route.useParams();
  const returnPath = useRouterState({
    select: (st) => st.location.pathname,
  });

  const salonQ = useQuery({
    queryKey: ["admin", "salon", salonId],
    queryFn: () => fetchAdminSalonDetail(salonId),
  });

  const s = salonQ.data;

  if (salonQ.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (salonQ.isError) {
    return <p className="text-sm text-destructive">{(salonQ.error as Error)?.message}</p>;
  }
  if (!s) return null;

  const displayName = (b: (typeof s.staff_barbers)[0]) => b.full_name || b.email;

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pb-4 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-5" aria-hidden />
          </span>
          Jamoa
        </CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-relaxed">
          Egasi va faol ishchilar. Ism ustiga bosib sartarosh sahifasiga o‘ting; «Orqaga» salon jamoasiga
          qaytaradi.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {s.staff_barbers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Sartarosh yozuvlari yo‘q.
          </p>
        ) : (
          <ul className="space-y-2">
            {s.staff_barbers.map((b) => (
              <li key={b.id}>
                <Link
                  to="/admin/barbers/$barberId"
                  params={{ barberId: b.id }}
                  search={{ returnTo: returnPath }}
                  className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-muted/20 hover:shadow-md"
                >
                  <Avatar className="size-11 border border-border/60">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {initials(displayName(b), b.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{displayName(b)}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.email}</p>
                    {b.phone ? (
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{b.phone}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {roleUz(b.role)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {b.invite_state}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
