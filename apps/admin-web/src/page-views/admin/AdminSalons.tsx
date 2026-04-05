"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UZ_REGIONS } from "@/lib/uz-regions";
import {
  fetchAdminSalons,
  patchAdminSalon,
  deleteAdminSalon,
  type AdminSalonRow,
} from "@/lib/admin-api";
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
import { Loader2, Check, Trash2 } from "lucide-react";

export default function AdminSalons() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [salonQ, setSalonQ] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [salonFilter, setSalonFilter] = useState<"all" | "pending" | "pub">("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminSalonRow | null>(null);

  useEffect(() => {
    const r = searchParams.get("region");
    if (r) setRegionFilter(r);
  }, [searchParams]);

  const pubParam =
    salonFilter === "pending" ? ("0" as const) : salonFilter === "pub" ? ("1" as const) : undefined;

  const { data: salonsRes, isLoading: ls } = useQuery({
    queryKey: ["admin", "salons", salonQ, pubParam, regionFilter],
    queryFn: () =>
      fetchAdminSalons({
        q: salonQ || undefined,
        published: pubParam,
        region: regionFilter || undefined,
      }),
  });

  const salons = salonsRes?.results ?? [];

  const patchSalon = useMutation({
    mutationFn: ({ id, is_published }: { id: number; is_published: boolean }) =>
      patchAdminSalon(id, { is_published }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "salons"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  const removeSalon = useMutation({
    mutationFn: (id: number) => deleteAdminSalon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "salons"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-4">
        <h1 className="text-xl font-bold">Salonlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasdiqlash, chop etish va salonni butunlay o‘chirish (admin huquqi).
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Salon yoki email bo'yicha..."
            value={salonQ}
            onChange={(e) => setSalonQ(e.target.value)}
            className="max-w-md rounded-xl"
          />
          <Select
            value={regionFilter || "__all"}
            onValueChange={(v) =>
              setRegionFilter(v === "__all" ? "" : v === "__UNSET__" ? "__UNSET__" : v)
            }
          >
            <SelectTrigger className="w-full max-w-[260px] rounded-xl">
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
          <div className="flex gap-1">
            {(
              [
                ["all", "Hammasi"],
                ["pending", "Kutilmoqda"],
                ["pub", "Chop etilgan"],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSalonFilter(k)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  salonFilter === k ? "bg-accent text-accent-foreground" : "bg-muted"
                }`}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
        {ls ? (
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Salon</TableHead>
                  <TableHead>Ish vaqti / dam</TableHead>
                  <TableHead>Ega</TableHead>
                  <TableHead>Viloyat</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salons.map((s: AdminSalonRow) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell
                      className="max-w-[220px] text-xs text-muted-foreground align-top"
                      title={s.schedule_summary || undefined}
                    >
                      {s.schedule_summary?.trim() ? (
                        <span className="line-clamp-2">{s.schedule_summary}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.owner_email}</TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                      {s.region_label || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.is_published ? (
                        <span className="text-emerald-500">Chop etilgan</span>
                      ) : (
                        <span className="text-amber-500">Kutilmoqda</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!s.is_published && (
                          <Button
                            size="sm"
                            className="h-8 border-0 gold-gradient text-gold-foreground"
                            disabled={patchSalon.isPending}
                            onClick={() => patchSalon.mutate({ id: s.id, is_published: true })}
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Tasdiqlash
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(s)}
                          aria-label="Salonni o‘chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {salons.length === 0 && (
              <p className="p-6 text-center text-muted-foreground text-sm">Salon yo&apos;q</p>
            )}
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salonni o‘chirish?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.name}» — xizmatlar, rasmlar va bandlar bilan bog‘liq yozuvlar o‘chiriladi
              (CASCADE). Qaytarib bo‘lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && removeSalon.mutate(deleteTarget.id)}
              disabled={removeSalon.isPending}
            >
              {removeSalon.isPending ? "O‘chirilmoqda..." : "O‘chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
