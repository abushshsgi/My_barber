import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  Building2,
  CalendarClock,
  Heart,
  MapPin,
  Phone,
  Star,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { fetchAdminSalonDetail } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { uzRegionLabel } from "@/lib/uz-regions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (salonQ.isError) {
    return <p className="text-sm text-destructive">{(salonQ.error as Error)?.message}</p>;
  }
  if (!s) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/80 to-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Yaratilgan
          </p>
          <p className="mt-2 font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg">
            {fmtIso(s.created_at)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-amber-500/5 to-card p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
            Sharhlar / reyting
          </p>
          <p className="mt-2 font-heading text-xl font-bold tabular-nums">
            {s.reviews_count}
            <span className="ml-2 text-base font-semibold text-muted-foreground">
              ({s.rating.toFixed(1)})
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-primary/5 to-card p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="size-3.5 text-primary" aria-hidden />
            Sartaroshlar
          </p>
          <p className="mt-2 font-heading text-2xl font-bold tabular-nums">{s.barbers_count}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-sky-500/5 to-card p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarClock className="size-3.5 text-sky-600" aria-hidden />
            Bronlar
          </p>
          <p className="mt-2 font-heading text-2xl font-bold tabular-nums">{s.bookings_count}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {s.completed_bookings_count} yakunlangan
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-emerald-500/5 to-card p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="size-3.5 text-emerald-600" aria-hidden />
            Daromad
          </p>
          <p className="mt-2 font-heading text-lg font-bold tabular-nums sm:text-xl">
            {formatAdminUzs(s.revenue_uzs)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-rose-500/5 to-card p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Heart className="size-3.5 text-rose-600" aria-hidden />
            Sevimlilar
          </p>
          <p className="mt-2 font-heading text-2xl font-bold tabular-nums">{s.favorites_count}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/70 shadow-sm lg:col-span-3">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Building2 className="size-4 text-primary" aria-hidden />
              Manzil va aloqa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 text-sm">
            <div className="flex gap-3 rounded-lg bg-muted/30 p-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <p className="leading-relaxed text-foreground">{s.address || "—"}</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Viloyat</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {uzRegionLabel(s.region) || "—"}
                </dd>
              </div>
              {s.phone ? (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Salon telefoni</dt>
                  <dd className="mt-0.5 flex items-center gap-2 font-medium tabular-nums text-foreground">
                    <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                    {s.phone}
                  </dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <User className="size-4 text-primary" aria-hidden />
              Egasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-5 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Biznes turi</p>
              <p className="mt-0.5 font-medium text-foreground">{s.business_kind_label || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ism</p>
              <p className="mt-0.5 font-medium text-foreground">{s.owner_name || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="mt-0.5 break-all font-medium text-foreground">{s.owner_email || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Telefon</p>
              <p className="mt-0.5 flex items-center gap-2 font-medium tabular-nums text-foreground">
                {s.owner_phone ? (
                  <>
                    <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                    {s.owner_phone}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {s.schedule_summary ? (
          <Card className="border-border/70 shadow-sm lg:col-span-5">
            <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarClock className="size-4 text-primary" aria-hidden />
                Ish vaqtlari
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm leading-relaxed text-muted-foreground">
              {s.schedule_summary}
            </CardContent>
          </Card>
        ) : null}
      </div>

      {s.hours.length > 0 ? (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4">
            <CardTitle className="text-base font-semibold">Haftalik soatlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 sm:px-6">Kun</th>
                    <th className="px-4 py-3 sm:px-6">Ochilish</th>
                    <th className="px-4 py-3 sm:px-6">Yopilish</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/80">
                  {s.hours.map((h, idx) => (
                    <tr
                      key={h.weekday}
                      className={idx % 2 === 0 ? "bg-card" : "bg-muted/20"}
                    >
                      <td className="px-4 py-2.5 font-medium tabular-nums sm:px-6">{h.weekday}</td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground sm:px-6">
                        {h.open_time}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground sm:px-6">
                        {h.close_time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
