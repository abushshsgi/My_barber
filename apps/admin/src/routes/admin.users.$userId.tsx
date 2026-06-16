import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminUserDetail, patchAdminUser } from "@/lib/admin-api";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserDetailPage,
});

function UserDetailPage() {
  const { userId } = Route.useParams();
  const qc = useQueryClient();

  const userQ = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchAdminUserDetail(userId),
  });

  const patchUser = useMutation({
    mutationFn: (body: Parameters<typeof patchAdminUser>[1]) => patchAdminUser(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "user", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Mijoz yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const u = userQ.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" asChild>
        <Link to="/admin/users">
          <ArrowLeft className="size-4" />
          Mijozlar
        </Link>
      </Button>

      {userQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : userQ.isError ? (
        <p className="text-sm text-destructive">{(userQ.error as Error).message}</p>
      ) : u ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold">{u.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{u.email || "Email yo'q"}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">ID {u.id}</p>
            </div>
            <StatusBadge status={u.is_active ? "active" : "inactive"} />
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Telefon</dt>
              <dd className="mt-1 font-medium tabular-nums">{u.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Bronlar</dt>
              <dd className="mt-1 font-medium tabular-nums">{u.bookings_count}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Ro'yxatdan o'tgan</dt>
              <dd className="mt-1 text-sm">{format(new Date(u.created_at), "dd MMM yyyy HH:mm")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Hudud</dt>
              <dd className="mt-1">
                <Select
                  value={u.region || "__UNSET__"}
                  onValueChange={(v) =>
                    patchUser.mutate({ region: v === "__UNSET__" ? "" : v })
                  }
                >
                  <SelectTrigger className="h-9 w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__UNSET__">Ko'rsatilmagan</SelectItem>
                    {UZ_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <span className="text-sm font-medium">Faol hisob</span>
            <Switch
              checked={u.is_active}
              onCheckedChange={(checked) => patchUser.mutate({ is_active: checked })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
