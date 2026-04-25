"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  fetchAdminBarbers,
  patchAdminBarber,
  deleteAdminBarber,
  type AdminBarberRow,
} from "@/lib/admin-api";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { Eye, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function AdminBarbers() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [userQ, setUserQ] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<AdminBarberRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<AdminBarberRow | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const r = searchParams.get("region");
    if (r) setRegionFilter(r);
  }, [searchParams]);

  const { data: res, isLoading } = useQuery({
    queryKey: ["admin", "barbers", userQ, regionFilter, page],
    queryFn: () =>
      fetchAdminBarbers({
        q: userQ || undefined,
        region: regionFilter || undefined,
        page,
      }),
  });

  const rows = res?.results ?? [];
  const count = res?.count ?? rows.length;
  const pageSize = useMemo(() => {
    if (!count) return rows.length || 0;
    if (rows.length && count > rows.length) return rows.length;
    return rows.length;
  }, [count, rows.length]);
  const totalPages = pageSize ? Math.max(1, Math.ceil(count / pageSize)) : 1;
  const canPrev = page > 1;
  const canNext = page < totalPages && Boolean(res?.next);

  useEffect(() => {
    // Reset pagination when filters change.
    setPage(1);
  }, [userQ, regionFilter]);

  const patchBarber = useMutation({
    mutationFn: (args: { id: number; body: Parameters<typeof patchAdminBarber>[1] }) =>
      patchAdminBarber(args.id, args.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "barbers"] }),
  });

  const removeBarber = useMutation({
    mutationFn: (id: number) => deleteAdminBarber(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "barbers"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="min-h-screen pb-10">
      <div className="sticky top-0 z-40 border-b bg-background/95 px-4 py-4 backdrop-blur-lg">
        <h1 className="text-xl font-bold">Sartaroshlar</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Barber akkauntlari (alohida jadval). Faollik, viloyat va o‘chirish — faqat admin JWT bilan.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            placeholder="Qidirish (email, ism, telefon)..."
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            className="max-w-md rounded-xl"
          />
          <Select
            value={regionFilter || "__all"}
            onValueChange={(v) =>
              setRegionFilter(v === "__all" ? "" : v === "__UNSET__" ? "__UNSET__" : v)
            }
          >
            <SelectTrigger className="w-[220px] rounded-xl">
              <SelectValue placeholder="Viloyat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Barcha viloyatlar</SelectItem>
              {UZ_REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
              <SelectItem value="__UNSET__">Viloyat ko‘rsatilmagan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Viloyat</TableHead>
                  <TableHead className="text-center">Salon (ega)</TableHead>
                  <TableHead>Faol</TableHead>
                  <TableHead>Ro&apos;yxat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u: AdminBarberRow) => (
                  <TableRow key={u.id}>
                    <TableCell className="max-w-[180px] truncate text-sm font-medium">{u.email}</TableCell>
                    <TableCell className="max-w-[120px] truncate text-sm">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.region || "__empty"}
                        onValueChange={(v) =>
                          patchBarber.mutate({
                            id: u.id,
                            body: { region: v === "__empty" ? "" : v },
                          })
                        }
                        disabled={patchBarber.isPending}
                      >
                        <SelectTrigger className="h-8 w-[200px] rounded-lg text-xs">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty">—</SelectItem>
                          {UZ_REGIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {u.owned_salons_count}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={(checked) =>
                          patchBarber.mutate({ id: u.id, body: { is_active: checked } })
                        }
                        disabled={patchBarber.isPending}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {u.date_joined ? format(new Date(u.date_joined), "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetailTarget(u)}
                          aria-label="Tafsilotlar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                          aria-label="O‘chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            )}
          </Card>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="px-4 pb-10">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (canPrev) setPage((p) => Math.max(1, p - 1));
                  }}
                  aria-disabled={!canPrev}
                  className={!canPrev ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  isActive
                  size="default"
                  className="tabular-nums"
                >
                  {page} / {totalPages}
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (canNext) setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  aria-disabled={!canNext}
                  className={!canNext ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={!!detailTarget} onOpenChange={(o) => !o && setDetailTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Barber tafsilotlari</DialogTitle>
            <DialogDescription className="break-all">
              {detailTarget?.email}
            </DialogDescription>
          </DialogHeader>

          {detailTarget && (
            <div className="grid gap-4">
              <div className="grid gap-2 text-sm">
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">Full name</div>
                  <div>{detailTarget.full_name || "—"}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">Phone</div>
                  <div>{detailTarget.phone || "—"}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">Region</div>
                  <div>{detailTarget.region_label || "—"}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">Work mode</div>
                  <div>{detailTarget.work_mode || "—"}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">Onboarding flow</div>
                  <div>{detailTarget.onboarding_flow || "—"}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">Onboarding completed</div>
                  <div>
                    {detailTarget.onboarding_completed_at
                      ? format(new Date(detailTarget.onboarding_completed_at), "d MMM yyyy, HH:mm")
                      : "—"}
                  </div>
                </div>
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <div className="text-muted-foreground">GPS (profile)</div>
                  <div className="tabular-nums">
                    {detailTarget.latitude || "—"}, {detailTarget.longitude || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-semibold tracking-wide">Signup snapshot</div>
                {!detailTarget.signup_snapshot ? (
                  <div className="mt-2 text-sm text-muted-foreground">—</div>
                ) : (
                  <div className="mt-2 grid gap-2 text-sm">
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <div className="text-muted-foreground">has_salon</div>
                      <div>{detailTarget.signup_snapshot.has_salon ? "true" : "false"}</div>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <div className="text-muted-foreground">shop_name</div>
                      <div>{detailTarget.signup_snapshot.shop_name || "—"}</div>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <div className="text-muted-foreground">age</div>
                      <div>{detailTarget.signup_snapshot.age ?? "—"}</div>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <div className="text-muted-foreground">address</div>
                      <div>{detailTarget.signup_snapshot.address || "—"}</div>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <div className="text-muted-foreground">staff_count_at_signup</div>
                      <div>{detailTarget.signup_snapshot.staff_count_at_signup ?? "—"}</div>
                    </div>
                    <div className="grid grid-cols-[160px_1fr] gap-2">
                      <div className="text-muted-foreground">raw_payload</div>
                      <pre className="max-h-60 overflow-auto rounded-md bg-background p-2 text-[11px] leading-snug">
                        {JSON.stringify(detailTarget.signup_snapshot.raw_payload ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sartaroshni o‘chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.email} — bu akkaunt, bog‘liq bandlar va sharhlar bazadan o‘chiriladi (CASCADE).
              Qaytarib bo‘lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && removeBarber.mutate(deleteTarget.id)}
              disabled={removeBarber.isPending}
            >
              {removeBarber.isPending ? "O‘chirilmoqda..." : "O‘chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
