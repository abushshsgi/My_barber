import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Snowflake } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAdminFrozenWallets,
  setAdminWalletFreeze,
  type AdminFrozenWallet,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";

export const Route = createFileRoute("/admin/finance/frozen")({
  component: AdminFrozenWalletsPage,
});

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminFrozenWalletsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  const listQ = useQuery({
    queryKey: ["admin", "wallet-frozen", search],
    queryFn: () => fetchAdminFrozenWallets({ q: search || undefined }),
    refetchInterval: 8_000,
  });

  const unfreezeM = useMutation({
    mutationFn: (row: AdminFrozenWallet) =>
      setAdminWalletFreeze(row.id, "unfreeze", "Admin paneldan ochildi"),
    onSuccess: () => {
      toast.success("Karta ochildi");
      void qc.invalidateQueries({ queryKey: ["admin", "wallet-frozen"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xato"),
  });

  const rows = listQ.data?.results ?? [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Muzlatilgan kartalar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Foydalanuvchi yoki admin muzlatgan hamyonlar. Kim muzlatgani va sababi ko‘rinadi.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism, telefon, hamyon…"
            className="w-56"
          />
          <Button type="submit" variant="secondary">
            Qidirish
          </Button>
        </form>
      </div>

      {listQ.isLoading ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Snowflake className="size-5" />}
          title="Muzlatilgan karta yo‘q"
          description="Hozircha hech kim kartasini muzlatmagan."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="px-4 py-3 font-medium">Hamyon</th>
                <th className="px-4 py-3 font-medium">Balans</th>
                <th className="px-4 py-3 font-medium">Kim muzlatgan</th>
                <th className="px-4 py-3 font-medium">Vaqt</th>
                <th className="px-4 py-3 font-medium">Sabab</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: String(row.user.id) }}
                      className="font-medium hover:underline"
                    >
                      {row.user.full_name || row.user.phone || `User #${row.user.id}`}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {row.user.phone || row.user.email || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.wallet_number}</td>
                  <td className="px-4 py-3">{formatAdminUzs(Number(row.balance))}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">
                      {row.frozen_by === "admin" ? "Admin" : "Foydalanuvchi"}
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.frozen_by_label || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatWhen(row.frozen_at)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
                    {row.freeze_reason || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={unfreezeM.isPending}
                      onClick={() => unfreezeM.mutate(row)}
                    >
                      Ochish
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
