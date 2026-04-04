"use client";

import { useState } from "react";
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
import { fetchAdminSalons, patchAdminSalon, type AdminSalonRow } from "@/lib/admin-api";
import { Loader2, Check } from "lucide-react";

export default function AdminSalons() {
  const qc = useQueryClient();
  const [salonQ, setSalonQ] = useState("");
  const [salonFilter, setSalonFilter] = useState<"all" | "pending" | "pub">("all");

  const pubParam =
    salonFilter === "pending" ? ("0" as const) : salonFilter === "pub" ? ("1" as const) : undefined;

  const { data: salonsRes, isLoading: ls } = useQuery({
    queryKey: ["admin", "salons", salonQ, pubParam],
    queryFn: () =>
      fetchAdminSalons({
        q: salonQ || undefined,
        published: pubParam,
      }),
  });

  const salons = salonsRes?.results ?? [];

  const patchSalon = useMutation({
    mutationFn: ({ id, is_published }: { id: number; is_published: boolean }) =>
      patchAdminSalon(id, { is_published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "salons"] }),
  });

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-4">
        <h1 className="text-xl font-bold">Salonlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Barcha salonlar — ega, chop etish holati va tasdiqlash (API orqali).
        </p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Salon yoki email bo'yicha..."
            value={salonQ}
            onChange={(e) => setSalonQ(e.target.value)}
            className="rounded-xl max-w-md"
          />
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
                  <TableHead>Ega</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="text-right">Tasdiqlash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salons.map((s: AdminSalonRow) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-sm">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.owner_email}</TableCell>
                    <TableCell className="text-xs">
                      {s.is_published ? (
                        <span className="text-emerald-500">Chop etilgan</span>
                      ) : (
                        <span className="text-amber-500">Kutilmoqda</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!s.is_published && (
                        <Button
                          size="sm"
                          className="h-8 gold-gradient text-gold-foreground border-0"
                          disabled={patchSalon.isPending}
                          onClick={() => patchSalon.mutate({ id: s.id, is_published: true })}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Tasdiqlash
                        </Button>
                      )}
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
    </div>
  );
}
