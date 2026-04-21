"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { EmptyState } from "@/panel/components/EmptyState";
import { Users } from "lucide-react";

export default function Clients() {
  const { clients } = useApp();

  if (clients.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Clients</h1>
        <p className="text-muted-foreground text-sm mb-6">Your client list</p>
        <EmptyState icon={Users} title="No clients yet" description="Clients will appear after completing bookings." />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm mt-1">{clients.length} clients</p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Visits</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold">{client.full_name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{client.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.phone || client.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{client.completed_bookings}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{client.classification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
