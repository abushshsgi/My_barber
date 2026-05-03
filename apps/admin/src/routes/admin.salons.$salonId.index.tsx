import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Building2, MapPin, Phone, Star, Users } from "lucide-react";
import { fetchAdminSalonDetail } from "@/lib/admin-api";
import { uzRegionLabel } from "@/lib/uz-regions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/admin/salons/$salonId/")({
  component: SalonOverviewTab,
});

function fmtIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd.MM.yyyy HH:mm");
  } catch {
    return iso;
  }
}

function SalonOverviewTab() {
  const { salonId } = Route.useParams();
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
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription>Yaratilgan</CardDescription>
            <CardTitle className="text-lg tabular-nums">{fmtIso(s.created_at)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Star className="size-3.5" /> Sharhlar / reyting
            </CardDescription>
            <CardTitle className="text-lg">
              <span className="tabular-nums">{s.reviews_count}</span>
              <span className="text-muted-foreground font-normal text-base ml-2">
                ({s.rating.toFixed(1)})
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="size-3.5" /> Sartaroshlar
            </CardDescription>
            <CardTitle className="text-lg tabular-nums">{s.barbers_count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4" /> Manzil va aloqa
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <div className="flex items-start gap-2">
            <MapPin className="size-4 shrink-0 mt-0.5" />
            <span className="text-foreground">{s.address || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Viloyat: </span>
            <span className="text-foreground">{uzRegionLabel(s.region) || "—"}</span>
          </div>
          {s.phone ? (
            <div className="flex items-center gap-2 tabular-nums">
              <Phone className="size-4 shrink-0" />
              <span className="text-foreground">{s.phone}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {s.schedule_summary ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ish vaqtlari (qisqa)</CardTitle>
            <CardDescription>{s.schedule_summary}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {s.hours.length > 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Haftalik soatlar</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2 pr-4">Kun</th>
                  <th className="py-2">Ochilish</th>
                  <th className="py-2">Yopilish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.hours.map((h) => (
                  <tr key={h.weekday}>
                    <td className="py-2 pr-4 tabular-nums">{h.weekday}</td>
                    <td className="py-2 tabular-nums">{h.open_time}</td>
                    <td className="py-2 tabular-nums">{h.close_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
