import { lazy, Suspense, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  BarChart3,
  Building2,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  Loader2,
  MapPin,
  MessageSquareText,
  Phone,
  Scissors,
  User,
  UserPlus,
} from "lucide-react";
import { fetchAdminBarberDetail, fetchAdminBarberCustomerInvites, type AdminBarber } from "@/lib/admin-api";
import { barberDetailSearchFromRaw } from "@/lib/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TableSkeleton } from "@/components/admin/Skeletons";

const AdminMap2GIS = lazy(() => import("@/components/admin/AdminMap2GIS"));

export const Route = createFileRoute("/admin/barbers/$barberId/")({
  validateSearch: (raw: Record<string, unknown>) => barberDetailSearchFromRaw(raw),
  component: BarberOverviewPage,
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

function inviteLabel(code: string): string {
  const m: Record<string, string> = {
    na: "—",
    invited: "Taklif",
    worker_accepted: "Ishchi qabul qildi",
    active: "Faol",
    declined: "Rad etilgan",
  };
  return m[code] ?? code;
}

function roleLabel(code: string): string {
  if (code === "owner") return "Egasi";
  if (code === "worker") return "Ishchi";
  return code;
}

function bookingStatusUz(code: string): string {
  const m: Record<string, string> = {
    pending: "Kutilmoqda",
    accepted: "Qabul qilindi",
    rejected: "Rad etildi",
    in_progress: "Jarayonda",
    completed: "Yakunlangan",
    cancelled: "Bekor qilingan",
  };
  return m[code] ?? code;
}

function BarberOverviewPage() {
  const { barberId } = Route.useParams();
  const [rawOpen, setRawOpen] = useState(false);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "barber", barberId],
    queryFn: () => fetchAdminBarberDetail(barberId),
  });

  const b = q.data;
  const mapBarber: AdminBarber | null = b
    ? {
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
        account_segment: b.account_segment,
        account_segment_label: b.account_segment_label,
      }
    : null;

  const mapsHref =
    b && Number.isFinite(b.lat) && Number.isFinite(b.lng)
      ? `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`
      : null;

  if (q.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  if (q.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Yuklashda xato</CardTitle>
          <CardDescription>{(q.error as Error)?.message ?? "Noma'lum xato"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!b) return null;

  const sum = b.bookings_summary;
  const statusKeys = Object.keys(sum.by_status);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-muted/20 px-3 py-2.5 sm:px-4">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Tezkor havolalar</span>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link to="/admin/barbers/$barberId/stats" params={{ barberId }}>
              <BarChart3 className="size-3.5" />
              Statistika
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link to="/admin/barbers/$barberId/bookings" params={{ barberId }}>
              <CalendarClock className="size-3.5" />
              Bronlar
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link to="/admin/barbers/$barberId/reviews" params={{ barberId }}>
              <MessageSquareText className="size-3.5" />
              Sharhlar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jami bronlar" value={String(sum.total)} hint="Barcha holatlar" />
        <StatCard
          label="Yakunlangan + daromad"
          value={`${sum.revenue_completed_uzs} so'm`}
          hint="Faqat completed"
        />
        <StatCard label="Sharhlar" value={String(b.reviews_count)} hint="Mijoz baholari" />
        <StatCard label="Egalik salonlari" value={String(b.owned_salons.length)} hint="Salonlar ro‘yxati" />
      </div>

      {statusKeys.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {statusKeys.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs"
            >
              <span className="font-medium">{bookingStatusUz(k)}</span>
              <span className="tabular-nums text-muted-foreground">{sum.by_status[k]}</span>
            </span>
          ))}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Building2 className="size-5 shrink-0" />
          Qaysi salonlar bilan bog‘langan
        </h2>
        {b.owned_salons.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {b.owned_salons.map((s) => (
              <Card key={s.id} className="overflow-hidden border-border/80 shadow-sm">
                <CardHeader className="pb-2 bg-muted/30">
                  <CardTitle className="text-base">Egalik: {s.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{s.address || "—"}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs space-y-1 text-muted-foreground">
                  <div>ID: {s.id}</div>
                  <div>{s.is_published ? "Chop etilgan" : "Chop etilmagan"}</div>
                  {s.phone ? <div className="tabular-nums">{s.phone}</div> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">O‘z nomiga ro‘yxatdan o‘tgan salon yo‘q.</p>
        )}

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Salon a’zoligi</CardTitle>
            <CardDescription>Boshqa salonlarda ishchi / taklif holati</CardDescription>
          </CardHeader>
          <CardContent>
            {b.memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">A’zolik yozuvlari yo‘q.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Salon</th>
                      <th className="px-3 py-2">Rol</th>
                      <th className="px-3 py-2">Holat</th>
                      <th className="px-3 py-2">Tajriba (yil)</th>
                      <th className="px-3 py-2">Ega tasdiq</th>
                      <th className="px-3 py-2">Faollashtirilgan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {b.memberships.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          {m.salon_name}
                          <span className="text-xs text-muted-foreground ml-1">#{m.salon_id}</span>
                        </td>
                        <td className="px-3 py-2">{roleLabel(m.role)}</td>
                        <td className="px-3 py-2">
                          <span className="text-xs">{inviteLabel(m.invite_state)}</span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {m.experience_years != null ? m.experience_years : "—"}
                        </td>
                        <td className="px-3 py-2">{m.owner_approved ? "Ha" : "Yo‘q"}</td>
                        <td className="px-3 py-2 tabular-nums text-xs">{fmtIso(m.activated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <BarberCustomerInvitesSection barberId={barberId} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="size-4" /> Aloqa va profil
            </CardTitle>
            <CardDescription>Email, telefon va tizim vaqtlari (yuqorida ish turi alohida)</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <DetailRow label="Username" value={b.username} />
            <DetailRow label="Email" value={b.email} />
            <DetailRow
              label="Telefon"
              value={
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Phone className="size-3.5 shrink-0" /> {b.phone}
                </span>
              }
            />
            <DetailRow label="Viloyat" value={b.region_label || b.region || "—"} />
            <DetailRow label="Egalikdagi salonlar soni" value={String(b.owned_salons_count)} />
            <DetailRow
              label="Profilda ko‘rinadigan salon"
              value={b.salon_name ? `${b.salon_name} (ID ${b.salon_id ?? "—"})` : "—"}
            />
            <DetailRow label="Onboarding tugagan" value={fmtIso(b.onboarding_completed_at)} />
            <DetailRow label="Ro‘yxatdan o‘tgan" value={fmtIso(b.created_at)} />
            <DetailRow label="So‘nggi kirish" value={fmtIso(b.last_login)} />
            <Collapsible open={technicalOpen} onOpenChange={setTechnicalOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 px-0 h-auto font-normal text-foreground"
                >
                  <ChevronDown
                    className={`size-4 mr-1 transition-transform ${technicalOpen ? "rotate-180" : ""}`}
                  />
                  Tizim maydonlari (ish rejimi, oqim)
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 border-t border-border/60 mt-2">
                <DetailRow label="Ish rejimi" value={workModeLabel(b.work_mode)} />
                <DetailRow label="Ro‘yxatdan o‘tish oqimi" value={onboardingLabel(b.onboarding_flow)} />
                <DetailRow label="Biznes turi" value={b.business_kind_label || "Belgilanmagan"} />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
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
            {mapsHref ? (
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a href={mapsHref} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5 mr-1.5" />
                  Google Maps
                </a>
              </Button>
            ) : null}
            {mapBarber && Number.isFinite(mapBarber.lat) && Number.isFinite(mapBarber.lng) ? (
              <div className="mt-4 h-[240px] w-full rounded-xl border border-border overflow-hidden bg-background shadow-inner">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center text-muted-foreground text-xs gap-2">
                      <Loader2 className="size-4 animate-spin" /> Xarita…
                    </div>
                  }
                >
                  <AdminMap2GIS salons={[]} barbers={[mapBarber]} />
                </Suspense>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {b.signup_snapshot ? (
        <Card className="border-border/80 shadow-sm">
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
            <Collapsible open={rawOpen} onOpenChange={setRawOpen}>
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
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed border border-border">
                  {JSON.stringify(b.signup_snapshot.raw_payload, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="size-4" /> Salon xizmatlari
            </CardTitle>
            <CardDescription>Bog‘langan salonlar</CardDescription>
          </CardHeader>
          <CardContent>
            {b.salon_services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Salon xizmatlari yo‘q.</p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/90 text-xs uppercase text-muted-foreground backdrop-blur">
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

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="size-4" /> Mustaqil profil xizmatlari
            </CardTitle>
            <CardDescription>BarberService</CardDescription>
          </CardHeader>
          <CardContent>
            {b.independent_services.length === 0 ? (
              <p className="text-sm text-muted-foreground">Mustaqil xizmatlar yo‘q.</p>
            ) : (
              <div className="max-h-80 overflow-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/90 text-xs uppercase text-muted-foreground">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">So‘nggi bronlar</CardTitle>
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link to="/admin/barbers/$barberId/bookings" params={{ barberId }}>
                Barchasi →
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {b.recent_bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bronlar yo‘q.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {b.recent_bookings.map((bk) => (
                  <li
                    key={bk.id}
                    className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium truncate">{bk.customer_name}</span>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
                        {bookingStatusUz(bk.status)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {bk.services_preview}
                    </div>
                    <div className="text-xs flex justify-between text-muted-foreground">
                      <span>{fmtIso(bk.start_at)}</span>
                      <span className="tabular-nums">{bk.total_price} so'm</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">So‘nggi sharhlar</CardTitle>
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link to="/admin/barbers/$barberId/reviews" params={{ barberId }}>
                Barchasi →
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {b.recent_reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sharhlar yo‘q.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {b.recent_reviews.map((r) => (
                  <li key={r.id} className="rounded-lg border border-border/80 px-3 py-2 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">
                        {r.author_email}
                      </span>
                      <span className="tabular-nums font-medium">{r.rating}/5</span>
                    </div>
                    <p className="text-foreground line-clamp-2">{r.text || "—"}</p>
                    {r.barber_reply ? (
                      <p className="text-xs text-muted-foreground border-l-2 pl-2 line-clamp-2">
                        Javob: {r.barber_reply}
                      </p>
                    ) : null}
                    <div className="text-xs text-muted-foreground">{fmtIso(r.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {b.spoken_languages.length > 0 ? (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Muloqot tillari</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{b.spoken_languages.join(", ")}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function BarberCustomerInvitesSection({ barberId }: { barberId: string }) {
  const invQ = useQuery({
    queryKey: ["admin", "barber", barberId, "customer-invites"],
    queryFn: () => fetchAdminBarberCustomerInvites(barberId),
  });
  const d = invQ.data;

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
        <UserPlus className="size-5 shrink-0" />
        Mijoz chaqirishlari
      </h2>
      {invQ.isLoading ? (
        <TableSkeleton rows={4} />
      ) : !d ? (
        <p className="text-sm text-muted-foreground">Ma’lumot yuklanmadi.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Kod" value={d.code || "—"} hint="Taklif kodi" />
            <StatCard
              label="Qo‘shilgan"
              value={String(d.invite_count)}
              hint="MySaloon’ga kirganlar"
            />
            <StatCard
              label="Outreach"
              value={String(d.outreach_total)}
              hint={`Kutilmoqda: ${d.outreach_pending}`}
            />
            <StatCard
              label="Mos kelgan"
              value={String(d.outreach_joined)}
              hint="Telefon bo‘yicha bog‘langan"
            />
          </div>
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Chaqirilgan mijozlar</CardTitle>
              <CardDescription>Kim, qachon va qaysi kod orqali</CardDescription>
            </CardHeader>
            <CardContent>
              {d.invites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali chaqirilgan mijoz yo‘q.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Mijoz</th>
                        <th className="px-3 py-2">Telefon</th>
                        <th className="px-3 py-2">Manba</th>
                        <th className="px-3 py-2">Vaqt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {d.invites.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <Link
                              to="/admin/users/$userId"
                              params={{ userId: String(row.customer.id) }}
                              className="hover:underline"
                            >
                              {row.customer.full_name}
                            </Link>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-xs">
                            {row.customer.phone || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">{row.source}</td>
                          <td className="px-3 py-2 tabular-nums text-xs">{fmtIso(row.joined_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 font-heading text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3 sm:items-start border-b border-border/60 last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground shrink-0 sm:w-44 text-xs sm:text-sm">{label}</span>
      <div className="text-foreground break-words min-w-0 text-sm">{value}</div>
    </div>
  );
}
