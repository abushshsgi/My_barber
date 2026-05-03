import { lazy, Suspense, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Scissors,
  User,
} from "lucide-react";
import { fetchAdminBarberDetail, type AdminBarber, type AdminBarberDetail } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TableSkeleton } from "@/components/admin/Skeletons";

const AdminMapLeaflet = lazy(() => import("@/components/admin/AdminMapLeaflet"));

export const Route = createFileRoute("/admin/barbers/$barberId")({
  component: BarberDetailPage,
});

function fmtIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd.MM.yyyy HH:mm");
  } catch {
    return iso;
  }
}

function workModeLabel(code: string): string {
  if (code === "salon") return "Salon asosida";
  if (code === "independent") return "Mustaqil";
  return code || "—";
}

function onboardingLabel(code: string): string {
  const m: Record<string, string> = {
    owner: "Salon egasi",
    employee: "Ishchi",
    mybarber: "MyBarber",
    independent: "Mustaqil ro‘yxat",
  };
  return m[code] ?? (code || "—");
}

function BarberDetailPage() {
  const { barberId } = Route.useParams();
  const [rawOpen, setRawOpen] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "barber", barberId],
    queryFn: () => fetchAdminBarberDetail(barberId),
  });

  const b = q.data;
  const mapBarber: AdminBarber | null = useMemo(() => {
    if (!b) return null;
    return {
      id: b.id,
      name: b.name,
      avatar: b.avatar,
      phone: b.phone,
      region: b.region,
      salon_id: b.salon_id,
      salon_name: b.salon_name,
      rating: b.rating,
      reviews_count: b.reviews_count,
      is_active: b.is_active,
      lat: b.lat,
      lng: b.lng,
      created_at: b.created_at,
    };
  }, [b]);

  const osmHref =
    b && Number.isFinite(b.lat) && Number.isFinite(b.lng)
      ? `https://www.openstreetmap.org/?mlat=${b.lat}&mlon=${b.lng}#map=15/${b.lat}/${b.lng}`
      : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <Link
        to="/admin/barbers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Sartaroshlar
      </Link>

      {q.isLoading ? (
        <div className="space-y-4">
          <div className="h-10 w-64 bg-muted animate-pulse rounded-lg" />
          <TableSkeleton rows={6} cols={4} />
        </div>
      ) : q.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Yuklashda xato</CardTitle>
            <CardDescription>{(q.error as Error)?.message ?? "Noma'lum xato"}</CardDescription>
          </CardHeader>
        </Card>
      ) : b ? (
        <BarberDetailBody
          b={b}
          mapBarber={mapBarber}
          osmHref={osmHref}
          rawOpen={rawOpen}
          onRawOpenChange={setRawOpen}
        />
      ) : null}
    </div>
  );
}

function BarberDetailBody({
  b,
  mapBarber,
  osmHref,
  rawOpen,
  onRawOpenChange,
}: {
  b: AdminBarberDetail;
  mapBarber: AdminBarber | null;
  osmHref: string | null;
  rawOpen: boolean;
  onRawOpenChange: (v: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <img
            src={b.avatar}
            alt=""
            className="size-16 rounded-2xl object-cover ring-1 ring-border shrink-0"
          />
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {b.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Mail className="size-3.5" />
                {b.email}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone className="size-3.5" />
                {b.phone}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={b.is_active ? "active" : "inactive"} />
              <span className="text-xs text-muted-foreground">
                Reyting {b.rating.toFixed(1)} · {b.reviews_count} sharh
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" /> Akkaunt va onboarding
            </CardTitle>
            <CardDescription>Ish rejimi va ro‘yxatdan o‘tish oqimi</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <DetailRow label="Username" value={b.username} />
            <DetailRow label="Viloyat" value={b.region_label || b.region || "—"} />
            <DetailRow label="Egalikdagi salonlar soni" value={String(b.owned_salons_count)} />
            <DetailRow
              label="Asosiy salon"
              value={b.salon_name ? `${b.salon_name} (ID ${b.salon_id ?? "—"})` : "—"}
            />
            <DetailRow label="Ish rejimi" value={workModeLabel(b.work_mode)} />
            <DetailRow label="Ro‘yxatdan o‘tish oqimi" value={onboardingLabel(b.onboarding_flow)} />
            <DetailRow label="Onboarding tugagan" value={fmtIso(b.onboarding_completed_at)} />
            <DetailRow label="Ro‘yxatdan o‘tgan" value={fmtIso(b.created_at)} />
            <DetailRow label="So‘nggi kirish" value={fmtIso(b.last_login)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4" /> Joylashuv
            </CardTitle>
            <CardDescription>Manzil va GPS</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <DetailRow label="Manzil matni" value={b.location_text || "—"} />
            <DetailRow
              label="Koordinatalar"
              value={
                Number.isFinite(b.lat) && Number.isFinite(b.lng)
                  ? `${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}`
                  : "—"
              }
            />
            {osmHref ? (
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href={osmHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5 mr-1.5" />
                  OpenStreetMap
                </a>
              </Button>
            ) : null}
            {mapBarber && Number.isFinite(mapBarber.lat) && Number.isFinite(mapBarber.lng) ? (
              <div className="mt-4 h-[220px] w-full rounded-xl border border-border overflow-hidden bg-background">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-muted-foreground text-xs gap-2">
                      <Loader2 className="size-4 animate-spin" /> Xarita…
                    </div>
                  }
                >
                  <AdminMapLeaflet salons={[]} barbers={[mapBarber]} />
                </Suspense>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {b.signup_snapshot ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ro‘yxatdan o‘tish vaqtiagi ma’lumot</CardTitle>
            <CardDescription>Signup snapshot</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <DetailRow
              label="Salon bor deb belgilangan"
              value={b.signup_snapshot.has_salon ? "Ha" : "Yo‘q"}
            />
            <DetailRow label="Do‘kon / salon nomi" value={b.signup_snapshot.shop_name || "—"} />
            <DetailRow
              label="Yosh"
              value={b.signup_snapshot.age != null ? String(b.signup_snapshot.age) : "—"}
            />
            <DetailRow label="Manzil (signup)" value={b.signup_snapshot.address || "—"} />
            <DetailRow
              label="Xodimlar soni (signup)"
              value={
                b.signup_snapshot.staff_count_at_signup != null
                  ? String(b.signup_snapshot.staff_count_at_signup)
                  : "—"
              }
            />
            <DetailRow label="Snapshot yaratilgan" value={fmtIso(b.signup_snapshot.created_at)} />
            <Collapsible open={rawOpen} onOpenChange={onRawOpenChange}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 px-0 h-auto font-normal text-foreground"
                >
                  <ChevronDown
                    className={`size-4 mr-1 transition-transform ${rawOpen ? "rotate-180" : ""}`}
                  />
                  To‘liq JSON (raw_payload)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed">
                  {JSON.stringify(b.signup_snapshot.raw_payload, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Salon a’zoligi</CardTitle>
          <CardDescription>Membershiplar</CardDescription>
        </CardHeader>
        <CardContent>
          {b.memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">A’zolik yozuvlari yo‘q.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Salon</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2">Holat</th>
                    <th className="px-3 py-2">Faollashtirilgan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {b.memberships.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2">
                        {m.salon_name}
                        <span className="text-xs text-muted-foreground ml-1">#{m.salon_id}</span>
                      </td>
                      <td className="px-3 py-2">{m.role}</td>
                      <td className="px-3 py-2">{m.invite_state}</td>
                      <td className="px-3 py-2 tabular-nums">{fmtIso(m.activated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="size-4" /> Salon xizmatlari
            </CardTitle>
            <CardDescription>Bog‘langan salonlar bo‘yicha</CardDescription>
          </CardHeader>
          <CardContent>
            {b.salon_services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Salon xizmatlari yo‘q.</p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Salon</th>
                      <th className="px-3 py-2">Xizmat</th>
                      <th className="px-3 py-2">Narx</th>
                      <th className="px-3 py-2">daq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {b.salon_services.map((s) => (
                      <tr key={`${s.salon_id}-${s.id}`}>
                        <td className="px-3 py-2 text-xs">{s.salon_name}</td>
                        <td className="px-3 py-2">
                          {s.name}
                          {!s.is_active ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (o‘chirilgan)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{s.price}</td>
                        <td className="px-3 py-2 tabular-nums">{s.duration_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="size-4" /> Mustaqil profil xizmatlari
            </CardTitle>
            <CardDescription>BarberService (profil)</CardDescription>
          </CardHeader>
          <CardContent>
            {b.independent_services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Mustaqil xizmatlar yo‘q.</p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Xizmat</th>
                      <th className="px-3 py-2">Narx</th>
                      <th className="px-3 py-2">daq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {b.independent_services.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2">
                          {s.name}
                          {!s.is_active ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (o‘chirilgan)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{s.price}</td>
                        <td className="px-3 py-2 tabular-nums">{s.duration_minutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {b.spoken_languages.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Muloqot tillari</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{b.spoken_languages.join(", ")}</CardContent>
        </Card>
      ) : null}
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <span className="text-muted-foreground shrink-0 sm:w-44">{label}</span>
      <span className="text-foreground break-words">{value}</span>
    </div>
  );
}
