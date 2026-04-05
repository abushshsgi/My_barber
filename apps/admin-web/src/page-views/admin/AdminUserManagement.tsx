"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
  fetchAdminUsers,
  patchAdminUser,
  type AdminUserRow,
} from "@/lib/admin-api";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminUserManagement({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const qc = useQueryClient();
  const [userQ, setUserQ] = useState("");
  const [regionFilter, setRegionFilter] = useState<string>("");

  const { data: usersRes, isLoading } = useQuery({
    queryKey: ["admin", "users", "clients", userQ, regionFilter],
    queryFn: () =>
      fetchAdminUsers({
        role: "USER",
        q: userQ || undefined,
        region: regionFilter || undefined,
      }),
  });

  const users = usersRes?.results ?? [];

  const patchUser = useMutation({
    mutationFn: (args: { id: number; body: Parameters<typeof patchAdminUser>[1] }) =>
      patchAdminUser(args.id, args.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });

  return (
    <div className="min-h-screen pb-10">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-4">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">{description}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Input
            placeholder="Qidirish (email, ism, telefon)..."
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            className="rounded-xl max-w-md"
          />
          <Select value={regionFilter || "__all"} onValueChange={(v) => setRegionFilter(v === "__all" ? "" : v)}>
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
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto" />
        ) : (
          <Card className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Viloyat</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Faol</TableHead>
                  <TableHead>Ro&apos;yxat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: AdminUserRow) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-sm max-w-[160px] truncate">{u.email}</TableCell>
                    <TableCell className="text-sm max-w-[120px] truncate">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Select
                        value={u.region || "__empty"}
                        onValueChange={(v) =>
                          patchUser.mutate({
                            id: u.id,
                            body: { region: v === "__empty" ? "" : v },
                          })
                        }
                        disabled={patchUser.isPending}
                      >
                        <SelectTrigger className="h-8 w-[200px] text-xs rounded-lg">
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
                    <TableCell className="text-xs text-muted-foreground">USER</TableCell>
                    <TableCell>
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={(checked) =>
                          patchUser.mutate({ id: u.id, body: { is_active: checked } })
                        }
                        disabled={patchUser.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {u.date_joined ? format(new Date(u.date_joined), "d MMM yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {users.length === 0 && (
              <p className="p-8 text-center text-muted-foreground text-sm">Ma&apos;lumot yo&apos;q</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
