import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchAuditLog } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

function AuditPage() {
  const q = useQuery({ queryKey: ["admin", "audit"], queryFn: () => fetchAuditLog() });
  const data = q.data ?? [];
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Audit log
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Admin amallari tarixi.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Admin</th>
                  <th className="px-6 py-3 font-medium">Amal</th>
                  <th className="px-6 py-3 font-medium">Obyekt</th>
                  <th className="px-6 py-3 font-medium">IP</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((a) => (
                  <tr key={a.id} className="hover:bg-background/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={a.admin_avatar}
                          className="size-7 rounded-full object-cover"
                          alt=""
                        />
                        <span className="font-medium text-foreground">{a.admin}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-foreground">{a.action}</td>
                    <td className="px-6 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{a.target_type}</span> · {a.target_name}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground tabular-nums">
                      {a.ip}
                    </td>
                    <td className="px-6 py-3 text-muted-foreground tabular-nums">
                      {format(new Date(a.created_at), "dd MMM HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
