import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Building2, MapPin, MoreHorizontal, Phone, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAdminSalonDetail,
  patchAdminSalon,
  deleteAdminSalon,
} from "@/lib/admin-api";
import { uzRegionLabel } from "@/lib/uz-regions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

export const Route = createFileRoute("/admin/salons/$salonId")({
  component: SalonDetailPage,
});

function fmtIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "dd.MM.yyyy HH:mm");
  } catch {
    return iso;
  }
}

function roleUz(role: string): string {
  if (role === "owner") return "Egasi";
  if (role === "worker") return "Ishchi";
  return role;
}

function SalonDetailPage() {
  const { salonId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const salonQ = useQuery({
    queryKey: ["admin", "salon", salonId],
    queryFn: () => fetchAdminSalonDetail(salonId),
  });

  const patchSalon = useMutation({
    mutationFn: (body: Parameters<typeof patchAdminSalon>[1]) => patchAdminSalon(salonId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "salon", salonId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Salon yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSalon = useMutation({
    mutationFn: () => deleteAdminSalon(salonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Salon o‘chirildi");
      navigate({ to: "/admin/salons" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = salonQ.data;

  return (
    <div className="min-h-[50vh] bg-gradient-to-b from-muted/25 to-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/admin/salons"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" /> Salonlar
          </Link>

          {salonQ.isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-9 w-64 bg-muted rounded-lg" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          ) : salonQ.isError ? (
            <p className="text-sm text-destructive">{(salonQ.error as Error)?.message}</p>
          ) : s ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-semibold tracking-tight truncate">
                  {s.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ID {s.id}
                  {s.slug ? (
                    <span className="ml-2 tabular-nums">
                      · slug: <span className="text-foreground">{s.slug}</span>
                    </span>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.published ? "published" : "draft"} />
                  {s.premium ? (
                    <span className="rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 px-2 py-0.5 text-xs font-medium">
                      Premium
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => patchSalon.mutate({ published: !s.published })}
                  disabled={patchSalon.isPending}
                >
                  {s.published ? "Yashirish" : "Tasdiqlash"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-4 mr-2" />
                      O‘chirish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {s ? (
          <>
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

            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Jamoa</CardTitle>
                <CardDescription>
                  Egasi va faol ishchilar. Ism ustiga bosib sartarosh sahifasiga o‘ting.
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
          </>
        ) : null}
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Salonni o‘chirish"
        description={s ? `"${s.name}" salonini o‘chirishni tasdiqlaysizmi?` : ""}
        loading={removeSalon.isPending}
        onConfirm={() => removeSalon.mutate()}
      />
    </div>
  );
}
