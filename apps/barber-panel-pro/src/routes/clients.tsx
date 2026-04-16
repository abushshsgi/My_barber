import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { User } from "lucide-react";
import { useIndependentClients } from "@/lib/client-queries";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const q = useIndependentClients();
  const rows = q.data ?? [];
  return (
    <>
      <Topbar title="Clients" />
      <div className="p-6">
        <div className="rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Phone</th>
                <th className="px-4 py-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Last Visit</th>
                <th className="px-4 py-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Total Visits</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((client) => (
                <tr key={client.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-medium">{client.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{client.phone || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{client.classification}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{client.completed_bookings}</td>
                </tr>
              ))}
              {q.isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              )}
              {!q.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
