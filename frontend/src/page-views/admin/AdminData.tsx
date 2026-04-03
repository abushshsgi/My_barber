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
import {
  fetchAdminSalons,
  fetchAdminUsers,
  patchAdminSalon,
  patchAdminUser,
  type AdminSalonRow,
  type AdminUserRow,
} from "@/lib/admin-api";
import { Loader2, Check } from "lucide-react";
import { format } from "date-fns";

const ROLES = ["USER", "BARBER_OWNER", "BARBER_STAFF", "ADMIN"] as const;

const AdminData = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "salons">("users");
  const [userQ, setUserQ] = useState("");
  const [salonQ, setSalonQ] = useState("");
  const [salonFilter, setSalonFilter] = useState<"all" | "pending" | "pub">("all");

  const pubParam =
    salonFilter === "pending" ? ("0" as const) : salonFilter === "pub" ? ("1" as const) : undefined;

  const { data: usersRes, isLoading: lu } = useQuery({
    queryKey: ["admin", "users", userQ],
    queryFn: () => fetchAdminUsers({ q: userQ || undefined }),
    enabled: tab === "users",
  });

  const { data: salonsRes, isLoading: ls } = useQuery({
    queryKey: ["admin", "salons", salonQ, pubParam],
    queryFn: () =>
      fetchAdminSalons({
        q: salonQ || undefined,
        published: pubParam,
      }),
    enabled: tab === "salons",
  });

  const users = usersRes?.results ?? [];
  const salons = salonsRes?.results ?? [];

  const patchUser = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => patchAdminUser(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });

  const patchSalon = useMutation({
    mutationFn: ({ id, is_published }: { id: number; is_published: boolean }) =>
      patchAdminSalon(id, { is_published }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "salons"] }),
  });

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-xl font-bold mb-3">Ma&apos;lumotlar</h1>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "users" as const, label: "Foydalanuvchilar" },
            { key: "salons" as const, label: "Salonlar" },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {tab === "users" && (
          <>
            <Input
              placeholder="Qidirish (email, ism, telefon)..."
              value={userQ}
              onChange={(e) => setUserQ(e.target.value)}
              className="rounded-xl max-w-md"
            />
            {lu ? (
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
            ) : (
              <Card className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Ro‘yxat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u: AdminUserRow) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm max-w-[180px] truncate">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <select
                            className="bg-muted border rounded-lg px-2 py-1 text-xs"
                            value={u.role}
                            onChange={(e) =>
                              patchUser.mutate({ id: u.id, role: e.target.value })
                            }
                            disabled={patchUser.isPending}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.date_joined ? format(new Date(u.date_joined), "d MMM yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {users.length === 0 && (
                  <p className="p-6 text-center text-muted-foreground text-sm">Ma&apos;lumot yo&apos;q</p>
                )}
              </Card>
            )}
          </>
        )}

        {tab === "salons" && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AdminData;
