import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { fetchAdmins, updateAdmin } from "@/lib/mock-api-extra";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/admin/StatusBadge";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Bosh admin",
  moderator: "Moderator",
  finance: "Moliya",
  support: "Yordam",
};

export const Route = createFileRoute("/admin/admins")({ component: AdminsPage });

function AdminsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin", "admins"], queryFn: fetchAdmins });
  const m = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAdmin>[1] }) =>
      updateAdmin(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "admins"] });
      toast.success("Admin yangilandi");
    },
  });

  const data = q.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Adminlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Platforma adminlari va ularning rollari.
        </p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Admin</th>
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">Oxirgi kirish</th>
                <th className="px-6 py-3 font-medium">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((a) => (
                <tr key={a.id} className="hover:bg-background/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={a.avatar} className="size-9 rounded-full object-cover" alt="" />
                      <div>
                        <div className="font-medium text-foreground">{a.name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground">{ROLE_LABELS[a.role]}</td>
                  <td className="px-6 py-4 text-muted-foreground tabular-nums">
                    {format(new Date(a.last_login), "dd MMM HH:mm")}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={a.is_active}
                        onCheckedChange={(v) => m.mutate({ id: a.id, body: { is_active: v } })}
                      />
                      <StatusBadge status={a.is_active ? "active" : "inactive"} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
