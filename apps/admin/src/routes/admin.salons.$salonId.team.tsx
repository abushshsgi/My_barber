import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminSalonDetail } from "@/lib/admin-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/salons/$salonId/team")({
  component: SalonTeamTab,
});

function roleUz(role: string): string {
  if (role === "owner") return "Egasi";
  if (role === "worker") return "Ishchi";
  return role;
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
    return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  }
  if (salonQ.isError) {
    return <p className="text-sm text-destructive">{(salonQ.error as Error)?.message}</p>;
  }
  if (!s) return null;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Jamoa</CardTitle>
        <CardDescription>
          Egasi va faol ishchilar. Ism ustiga bosib sartarosh sahifasiga o‘ting; «Orqaga» salon jamoasiga
          qaytaradi.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {s.staff_barbers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sartarosh yozuvlari yo‘q.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {s.staff_barbers.map((b) => (
              <li
                key={b.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3 bg-card hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <Link
                    to="/admin/barbers/$barberId"
                    params={{ barberId: b.id }}
                    search={{ returnTo: returnPath }}
                    className="font-medium text-foreground hover:underline"
                  >
                    {b.full_name || b.email}
                  </Link>
                  <div className="text-xs text-muted-foreground truncate">{b.email}</div>
                  {b.phone ? (
                    <div className="text-xs text-muted-foreground tabular-nums">{b.phone}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs rounded-md bg-muted px-2 py-0.5">{roleUz(b.role)}</span>
                  <span className="text-[11px] text-muted-foreground">{b.invite_state}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
